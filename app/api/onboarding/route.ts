import bcrypt from "bcryptjs";

import type { Prisma } from "@prisma/client";
import { SlotMode } from "@prisma/client";

import { getReservezySession } from "@/lib/auth/session";
import { parseUtcDateOnly } from "@/lib/dates/utc-date-only";
import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import {
  loadBusinessForOwnerSession,
  type OwnerBusinessLoaded,
} from "@/lib/server/business-for-owner-session";
import { onboardingPatchSchema } from "@/schemas/onboarding-patch";

async function disconnectStaffOffers(
  tx: Prisma.TransactionClient,
  businessId: string,
): Promise<void> {
  const staffRows = await tx.staffMember.findMany({
    where: { businessId },
    select: { id: true },
  });

  await Promise.all(
    staffRows.map((member) =>
      tx.staffMember.update({
        where: { id: member.id },
        data: {
          offeredServices: {
            set: [],
          },
        },
      }),
    ),
  );
}

async function bumpOnboardingCheckpoint(
  tx: Prisma.TransactionClient,
  businessId: string,
  completedStageNumber: number,
): Promise<void> {
  const current = await tx.business.findUnique({
    where: { id: businessId },
    select: { onboardingStep: true },
  });

  if (!current) {
    return;
  }

  await tx.business.update({
    where: { id: businessId },
    data: {
      onboardingStep: Math.max(current.onboardingStep, completedStageNumber),
    },
  });
}

function sanitizeColour(value?: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed;
}

function sanitizeOptionalUrl(raw?: string): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return null;
  }
  try {
    // eslint-disable-next-line no-new -- validating URL grammar only
    new URL(trimmed);
    return trimmed;
  } catch {
    return null;
  }
}

function serializeOnboardingPayload(business: OwnerBusinessLoaded) {
  const nextWizardStep =
    business.onboardingComplete || business.onboardingStep >= 8
      ? null
      : Math.min(8, business.onboardingStep + 1);

  return {
    business: {
      id: business.id,
      name: business.name,
      subdomain: business.subdomain,
      timezone: business.timezone,
      slotMode: business.slotMode,
      onboardingComplete: business.onboardingComplete,
      onboardingStep: business.onboardingStep,
      subscriptionTier: business.subscriptionTier,
      subscriptionStatus: business.subscriptionStatus,
      bookingBufferMinutes: business.bookingBufferMinutes,
      allowCustomerStaffSelection: business.allowCustomerStaffSelection,
      allowCustomerCancelReschedule: business.allowCustomerCancelReschedule,
      cancellationNoticeHours: business.cancellationNoticeHours,
      ownerEmail: business.owner.email,
    },
    branding: business.branding
      ? {
          logoUrl: business.branding.logoUrl,
          primaryColour: business.branding.primaryColour,
          secondaryColour: business.branding.secondaryColour,
          googleFontFamily: business.branding.googleFontFamily,
        }
      : null,
    availability: {
      holidays: business.holidays
        .filter((row) => !row.staffMemberId)
        .map((row) => ({
          id: row.id,
          label: row.label,
          date: row.dateStart.toISOString().slice(0, 10),
        })),
      workingHours: business.workingHours
        .filter((row) => !row.staffMemberId)
        .map((row) => ({
          dayOfWeek: row.dayOfWeek,
          openMinutes: row.openMinutes,
          closeMinutes: row.closeMinutes,
        }))
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    },
    services: business.services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      pricePence: service.pricePence,
      sortOrder: service.sortOrder,
    })),
    staff: business.staffMembers.map((member) => ({
      id: member.id,
      fullName: member.fullName,
      email: member.email,
      offeredServiceIds: member.offeredServices.map((svc) => svc.id),
      workingHours: member.workingHours
        .map((hour) => ({
          dayOfWeek: hour.dayOfWeek,
          openMinutes: hour.openMinutes,
          closeMinutes: hour.closeMinutes,
        }))
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    })),
    navigation: {
      nextWizardStep,
      checkoutUnlocked:
        business.onboardingStep >= 7 && !business.onboardingComplete,
    },
  };
}

export async function GET(): Promise<Response> {
  const session = await getReservezySession();
  const business = await loadBusinessForOwnerSession(session);
  if (!business) {
    return jsonError("Unauthorized.", 401);
  }

  return jsonOk(serializeOnboardingPayload(business));
}

export async function PATCH(request: Request): Promise<Response> {
  const session = await getReservezySession();
  const business = await loadBusinessForOwnerSession(session);
  if (!business) {
    return jsonError("Unauthorized.", 401);
  }

  if (business.onboardingComplete) {
    return jsonError("Onboarding is already complete.", 409);
  }

  let parsedJson: unknown;
  try {
    parsedJson = await request.json();
  } catch {
    return jsonError("Invalid JSON.", 400);
  }

  const validated = onboardingPatchSchema.safeParse(parsedJson);
  if (!validated.success) {
    const fieldErrors = validated.error.flatten().fieldErrors;
    return jsonError("Validation failed.", 422, fieldErrors);
  }

  const payload = validated.data;
  const businessId = business.id;

  switch (payload.step) {
    case "branding": {
      await prisma.$transaction(async (tx) => {
        await tx.branding.update({
          where: { businessId },
          data: {
            logoUrl: sanitizeOptionalUrl(payload.data.logoUrl),
            primaryColour: sanitizeColour(payload.data.primaryColour ?? undefined),
            secondaryColour: sanitizeColour(
              payload.data.secondaryColour ?? undefined,
            ),
            googleFontFamily: payload.data.googleFontFamily?.trim() || null,
          },
        });

        await bumpOnboardingCheckpoint(tx, businessId, 3);
      });
      break;
    }

    case "availability": {
      const seenDays = new Set<number>();
      for (const row of payload.data.workingHours) {
        if (row.closeMinutes <= row.openMinutes) {
          return jsonError(
            "Each working-hours block needs close time after opening time.",
            422,
          );
        }
        if (seenDays.has(row.dayOfWeek)) {
          return jsonError(
            "Provide at most one open/close range per weekday for the business.",
            422,
          );
        }
        seenDays.add(row.dayOfWeek);
      }

      const holidayWrites: Array<{ dateStart: Date; label: string | null }> = [];
      for (const holiday of payload.data.holidays) {
        const parsedHoliday = parseUtcDateOnly(holiday.date);
        if (!parsedHoliday) {
          return jsonError(
            `Holiday ${holiday.date} must be formatted as YYYY-MM-DD.`,
            422,
          );
        }

        holidayWrites.push({
          dateStart: parsedHoliday,
          label: holiday.label?.trim() || null,
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.holidayDate.deleteMany({
          where: {
            businessId,
            staffMemberId: null,
          },
        });

        await tx.workingHours.deleteMany({
          where: {
            businessId,
            staffMemberId: null,
          },
        });

        await Promise.all(
          payload.data.workingHours.map((row) =>
            tx.workingHours.create({
              data: {
                businessId,
                dayOfWeek: row.dayOfWeek,
                openMinutes: row.openMinutes,
                closeMinutes: row.closeMinutes,
              },
            }),
          ),
        );

        await Promise.all(
          holidayWrites.map((row) =>
            tx.holidayDate.create({
              data: {
                businessId,
                staffMemberId: null,
                dateStart: row.dateStart,
                label: row.label,
              },
            }),
          ),
        );

        await tx.business.update({
          where: { id: businessId },
          data: {
            bookingBufferMinutes: payload.data.bookingBufferMinutes,
          },
        });

        await bumpOnboardingCheckpoint(tx, businessId, 4);
      });
      break;
    }

    case "services": {
      await prisma.$transaction(async (tx) => {
        await disconnectStaffOffers(tx, businessId);
        await tx.service.deleteMany({ where: { businessId } });

        const sorted = [...payload.data.services].sort((a, b) => {
          const ao = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
          const bo = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
          if (ao === bo) {
            return a.name.localeCompare(b.name);
          }
          return ao - bo;
        });

        for (let index = 0; index < sorted.length; index += 1) {
          const svc = sorted[index];
          await tx.service.create({
            data: {
              businessId,
              name: svc.name,
              description: svc.description ?? "",
              durationMinutes: svc.durationMinutes,
              pricePence: svc.pricePence,
              sortOrder: svc.sortOrder ?? index,
            },
          });
        }

        await tx.business.update({
          where: { id: businessId },
          data: {
            slotMode: payload.data.slotMode as SlotMode,
          },
        });

        await bumpOnboardingCheckpoint(tx, businessId, 5);
      });
      break;
    }

    case "staff": {
      const rosterEmails = new Set<string>();
      for (const member of payload.data.members) {
        const lower = member.email.toLowerCase();
        if (rosterEmails.has(lower)) {
          return jsonError(
            "Each staff member needs a unique email address.",
            422,
          );
        }
        rosterEmails.add(lower);

        const dayTracker = new Set<number>();
        for (const shift of member.workingHours) {
          if (shift.closeMinutes <= shift.openMinutes) {
            return jsonError(
              `Staff shifts for ${member.email} must end after they start.`,
              422,
            );
          }
          if (dayTracker.has(shift.dayOfWeek)) {
            return jsonError(
              `Staff ${member.email} can only specify one availability block per weekday (or omit custom hours entirely).`,
              422,
            );
          }
          dayTracker.add(shift.dayOfWeek);
        }
      }

      const serviceIdsAllowed = new Set(
        business.services.map((svc) => svc.id),
      );
      for (const member of payload.data.members) {
        const rogue = member.offeredServiceIds.find(
          (idValue) => !serviceIdsAllowed.has(idValue),
        );
        if (rogue) {
          return jsonError(
            "Staff members can only deliver services configured for your workspace.",
            422,
          );
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.staffMember.deleteMany({ where: { businessId } });

        for (const member of payload.data.members) {
          const passwordHash = await bcrypt.hash(member.password, 12);

          const created = await tx.staffMember.create({
            data: {
              businessId,
              fullName: member.fullName,
              email: member.email,
              passwordHash,
              offeredServices: {
                connect: member.offeredServiceIds.map((idValue) => ({
                  id: idValue,
                })),
              },
            },
          });

          await Promise.all(
            member.workingHours.map((shift) =>
              tx.workingHours.create({
                data: {
                  businessId,
                  staffMemberId: created.id,
                  dayOfWeek: shift.dayOfWeek,
                  openMinutes: shift.openMinutes,
                  closeMinutes: shift.closeMinutes,
                },
              }),
            ),
          );
        }

        await tx.business.update({
          where: { id: businessId },
          data: {
            allowCustomerStaffSelection: payload.data.allowCustomerStaffSelection,
          },
        });

        await bumpOnboardingCheckpoint(tx, businessId, 6);
      });
      break;
    }

    case "bookingRules": {
      await prisma.$transaction(async (tx) => {
        await tx.business.update({
          where: { id: businessId },
          data: {
            allowCustomerStaffSelection:
              payload.data.allowCustomerStaffSelection,
            allowCustomerCancelReschedule:
              payload.data.allowCustomerCancelReschedule,
            cancellationNoticeHours: payload.data.cancellationNoticeHours,
          },
        });

        await bumpOnboardingCheckpoint(tx, businessId, 7);
      });
      break;
    }

    case "skipBilling": {
      // Mark onboarding complete without a Stripe subscription.
      // The booking page remains inactive until a subscription is activated.
      await prisma.business.update({
        where: { id: businessId },
        data: {
          onboardingComplete: true,
          onboardingStep: 8,
        },
      });
      break;
    }
  }

  const refreshed = await loadBusinessForOwnerSession(session);

  return jsonOk(
    refreshed ? serializeOnboardingPayload(refreshed) : { success: true },
  );
}
