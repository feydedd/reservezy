import { Prisma } from "@prisma/client";
import { BookingStatus } from "@prisma/client";

import { computeDiscountPence, finalPricePence } from "@/lib/booking/promo";
import { jsonError, jsonOk } from "@/lib/http/api-response";
import { parseIntakeFieldsJson, validateIntakeAnswers } from "@/lib/intake/fields";
import { prisma } from "@/lib/prisma";
import {
  publicBookingCreateSchema,
  type PublicBookingCreateInput,
} from "@/schemas/public-tenant";
import {
  hasIntakeAndAccountingExport,
  hasPremiumFeatures,
  hasSmsFeatures,
} from "@/lib/subscription/tiers";
import {
  sendCustomerConfirmation,
  sendOwnerNotification,
} from "@/lib/email/resend";
import { sendBookingConfirmationSms } from "@/lib/sms/twilio";
import { pushBookingToGoogleCalendar } from "@/lib/calendar/google";
import { pushBookingToOutlookCalendar } from "@/lib/calendar/outlook";
import { customerReferralBookingUrl } from "@/lib/urls/booking-page";

export const dynamic = "force-dynamic";

type RouteParams = { params: { subdomain: string } };

function paddedOverlap(
  slotStart: Date,
  slotEnd: Date,
  bookingStart: Date,
  bookingEnd: Date,
  bufferMinutes: number,
): boolean {
  const padMs = bufferMinutes * 60 * 1000;
  const bStart = bookingStart.getTime() - padMs;
  const bEnd = bookingEnd.getTime() + padMs;
  const s = slotStart.getTime();
  const e = slotEnd.getTime();
  return s < bEnd && e > bStart;
}

async function validateStaffAndService(
  businessId: string,
  payload: PublicBookingCreateInput,
  allowStaffSelection: boolean,
  staffCount: number,
  bookingLocationId: string | null,
): Promise<{ error: string; status: number } | null> {
  const staffRequired = allowStaffSelection && staffCount > 0;

  if (staffRequired && !payload.staffMemberId) {
    return { error: "Select a staff member.", status: 422 };
  }

  if (!allowStaffSelection && payload.staffMemberId) {
    return { error: "This business does not expose staff selection.", status: 422 };
  }

  if (payload.staffMemberId) {
    const staff = await prisma.staffMember.findFirst({
      where: {
        id: payload.staffMemberId,
        businessId,
        isActive: true,
      },
      include: {
        offeredServices: { select: { id: true } },
      },
    });
    if (!staff) {
      return { error: "Invalid staff member.", status: 404 };
    }
    if (!staff.offeredServices.some((s) => s.id === payload.serviceId)) {
      return {
        error: "That teammate does not perform this service.",
        status: 422,
      };
    }
    if (
      bookingLocationId &&
      staff.businessLocationId &&
      staff.businessLocationId !== bookingLocationId
    ) {
      return { error: "That team member is not at this location.", status: 422 };
    }
  }

  return null;
}

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const subdomain = params.subdomain.trim().toLowerCase();

  let bodyUnknown: unknown;
  try {
    bodyUnknown = await request.json();
  } catch {
    return jsonError("Invalid JSON.", 400);
  }

  const parsed = publicBookingCreateSchema.safeParse(bodyUnknown);
  if (!parsed.success) {
    return jsonError("Validation failed.", 422, parsed.error.flatten().fieldErrors);
  }

  const payload = parsed.data;
  const startsAt = new Date(payload.startsAt);
  const endsAt = new Date(payload.endsAt);

  if (!(startsAt < endsAt)) {
    return jsonError("Start time must be before end time.", 422);
  }

  const business = await prisma.business.findFirst({
    where: {
      subdomain,
      isDisabled: false,
      onboardingComplete: true,
    },
    include: {
      services: { where: { id: payload.serviceId, isActive: true } },
      staffMembers: { where: { isActive: true } },
      locations: { select: { id: true } },
      owner: { select: { email: true } },
    },
  });

  if (!business) {
    return jsonError("Business not found.", 404);
  }

  const hasStandardNotifications =
    business.subscriptionTier === "STANDARD" ||
    business.subscriptionTier === "PREMIUM";

  const service = business.services[0];
  if (!service) {
    return jsonError("Service not found.", 404);
  }

  const multiLoc =
    hasPremiumFeatures(business.subscriptionTier) &&
    business.locations.length >= 2;

  let bookingLocationId: string | null = null;
  if (multiLoc) {
    if (!payload.businessLocationId) {
      return jsonError("Please choose a location.", 422);
    }
    const okLoc = business.locations.some((l) => l.id === payload.businessLocationId);
    if (!okLoc) {
      return jsonError("Invalid location.", 404);
    }
    bookingLocationId = payload.businessLocationId;
  }

  if (
    bookingLocationId &&
    service.businessLocationId &&
    service.businessLocationId !== bookingLocationId
  ) {
    return jsonError("This service is not available at the selected location.", 422);
  }

  const expectedMs = service.durationMinutes * 60 * 1000;
  if (endsAt.getTime() - startsAt.getTime() !== expectedMs) {
    return jsonError("Times do not match the service duration.", 422);
  }

  const intakeFields = parseIntakeFieldsJson(service.intakeFormFieldsJson);
  if (hasIntakeAndAccountingExport(business.subscriptionTier)) {
    if (intakeFields.length > 0) {
      const v = validateIntakeAnswers(intakeFields, payload.intakeAnswers);
      if (!v.ok) {
        return jsonError(v.error, 422);
      }
    } else if (
      payload.intakeAnswers &&
      Object.keys(payload.intakeAnswers).length > 0
    ) {
      return jsonError("This service does not collect intake answers.", 422);
    }
  } else if (
    payload.intakeAnswers &&
    Object.keys(payload.intakeAnswers).length > 0
  ) {
    return jsonError("Intake forms are not available for this business plan.", 422);
  }

  let referredByCustomerId: string | null = null;
  if (payload.referralToken?.trim()) {
    const ref = await prisma.customer.findFirst({
      where: {
        businessId: business.id,
        referralToken: payload.referralToken.trim(),
      },
    });
    if (ref && ref.email !== payload.customerEmail) {
      referredByCustomerId = ref.id;
    }
  }

  const staffRule = await validateStaffAndService(
    business.id,
    payload,
    business.allowCustomerStaffSelection,
    business.staffMembers.length,
    bookingLocationId,
  );
  if (staffRule) {
    return jsonError(staffRule.error, staffRule.status);
  }

  try {
    const booking = await prisma.$transaction(
      async (tx) => {
        const andParts: Prisma.BookingWhereInput[] = [];
        if (payload.staffMemberId) {
          andParts.push({
            OR: [
              { staffMemberId: payload.staffMemberId },
              { staffMemberId: null },
            ],
          });
        }
        if (multiLoc && bookingLocationId) {
          andParts.push({
            OR: [
              { businessLocationId: bookingLocationId },
              { businessLocationId: null },
            ],
          });
        }

        const overlapping = await tx.booking.findMany({
          where: {
            businessId: business.id,
            status: BookingStatus.CONFIRMED,
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
            ...(andParts.length > 0 ? { AND: andParts } : {}),
          },
          select: {
            startsAt: true,
            endsAt: true,
            staffMemberId: true,
          },
        });

        const buffer = business.bookingBufferMinutes;
        const conflicts = overlapping.some((row) =>
          paddedOverlap(startsAt, endsAt, row.startsAt, row.endsAt, buffer),
        );

        if (conflicts) {
          throw new Error("SLOT_TAKEN");
        }

        let promoId: string | null = null;
        let discountPence = 0;
        if (payload.promoCode?.trim()) {
          const codeNorm = payload.promoCode.trim().toUpperCase();
          const promo = await tx.promoCode.findUnique({
            where: {
              businessId_code: { businessId: business.id, code: codeNorm },
            },
          });
          if (
            !promo ||
            !promo.active ||
            (promo.expiresAt && promo.expiresAt < new Date()) ||
            (promo.maxUses != null && promo.usedCount >= promo.maxUses) ||
            (promo.percentOff == null && promo.amountOffPence == null)
          ) {
            throw new Error("BAD_PROMO");
          }
          discountPence = computeDiscountPence(service.pricePence, promo);
          if (discountPence <= 0) {
            throw new Error("BAD_PROMO");
          }
          promoId = promo.id;
          await tx.promoCode.update({
            where: { id: promo.id },
            data: { usedCount: { increment: 1 } },
          });
        }

        const priceAfter = finalPricePence(service.pricePence, discountPence);

        const existingCustomer = await tx.customer.findFirst({
          where: {
            businessId: business.id,
            email: payload.customerEmail,
          },
        });

        const customer =
          existingCustomer !== null
            ? await tx.customer.update({
                where: { id: existingCustomer.id },
                data: {
                  fullName: payload.customerFullName,
                  phone: payload.customerPhone ?? "",
                },
              })
            : await tx.customer.create({
                data: {
                  businessId: business.id,
                  fullName: payload.customerFullName,
                  email: payload.customerEmail,
                  phone: payload.customerPhone ?? "",
                },
              });

        const created = await tx.booking.create({
          data: {
            businessId: business.id,
            serviceId: service.id,
            staffMemberId: payload.staffMemberId ?? null,
            customerId: customer.id,
            startsAt,
            endsAt,
            status: BookingStatus.CONFIRMED,
            notes: payload.notes ?? "",
            staffNotes: "",
            businessLocationId: bookingLocationId,
            referredByCustomerId,
            promoCodeId: promoId,
            discountPence: discountPence,
            pricePenceSnapshot: priceAfter,
            ...(hasIntakeAndAccountingExport(business.subscriptionTier) &&
            intakeFields.length > 0 &&
            payload.intakeAnswers
              ? {
                  intakeAnswersJson:
                    payload.intakeAnswers as Prisma.InputJsonValue,
                }
              : {}),
          },
          select: {
            id: true,
            managementToken: true,
            startsAt: true,
            endsAt: true,
          },
        });
        return {
          ...created,
          ownerEmail: business.owner.email,
          priceAfter,
          customerReferralToken: customer.referralToken,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    );

    if (hasStandardNotifications) {
      const emailPayload = {
        bookingId: booking.id,
        managementToken: booking.managementToken,
        businessName: business.name,
        businessSubdomain: business.subdomain,
        ownerEmail: booking.ownerEmail,
        serviceName: service.name,
        durationMinutes: service.durationMinutes,
        pricePence: booking.priceAfter,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        customerFullName: payload.customerFullName,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        notes: payload.notes,
        allowCancelReschedule: business.allowCustomerCancelReschedule,
        referralShareUrl: customerReferralBookingUrl(
          business.subdomain,
          booking.customerReferralToken,
        ),
      };
      const jobs: Promise<void>[] = [
        sendCustomerConfirmation(emailPayload),
        sendOwnerNotification(emailPayload),
      ];
      if (hasSmsFeatures(business.subscriptionTier) && payload.customerPhone) {
        jobs.push(
          sendBookingConfirmationSms({
            customerName: payload.customerFullName,
            customerPhone: payload.customerPhone,
            businessName: business.name,
            serviceName: service.name,
            startTime: booking.startsAt,
            timezone: business.timezone,
          }),
        );
      }
      Promise.all(jobs).catch(() => null);

      if (hasPremiumFeatures(business.subscriptionTier)) {
        const calPayload = {
          businessId: business.id,
          bookingId: booking.id,
          summary: `${service.name} — ${payload.customerFullName}`,
          description: payload.notes ?? undefined,
          startsAt: booking.startsAt,
          endsAt: booking.endsAt,
          timezone: business.timezone,
          attendeeEmail: payload.customerEmail,
        };
        pushBookingToGoogleCalendar(calPayload).catch(() => null);
        pushBookingToOutlookCalendar(calPayload).catch(() => null);
      }
    }

    return jsonOk(
      {
        bookingId: booking.id,
        managementToken: booking.managementToken,
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
      },
      201,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_TAKEN") {
      return jsonError(
        "That slot was just booked — pick another time.",
        409,
      );
    }
    if (error instanceof Error && error.message === "BAD_PROMO") {
      return jsonError("That promo code is not valid or has expired.", 422);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError("Double booking prevented — try another slot.", 409);
    }
    return jsonError("Unable to complete booking.", 500);
  }
}
