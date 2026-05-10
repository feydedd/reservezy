import { NextResponse } from "next/server";

import { BookingStatus } from "@prisma/client";

import { buildAvailabilitySlots } from "@/lib/booking/availability";
import { prisma } from "@/lib/prisma";
import { hasPremiumFeatures } from "@/lib/subscription/tiers";
import {
  publicAvailabilityQuerySchema,
  type PublicAvailabilityQuery,
} from "@/schemas/public-tenant";
import { TZDate } from "@date-fns/tz";

export const dynamic = "force-dynamic";

type RouteParams = { params: { subdomain: string } };

function parseQuery(url: URL): PublicAvailabilityQuery | null {
  const raw = {
    serviceId: url.searchParams.get("serviceId") ?? "",
    date: url.searchParams.get("date") ?? "",
    staffMemberId: url.searchParams.get("staffMemberId") ?? undefined,
    businessLocationId: url.searchParams.get("businessLocationId") ?? undefined,
  };
  const parsed = publicAvailabilityQuerySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function ymdParts(ymd: string): { y: number; m: number; d: number } | null {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!matched) {
    return null;
  }
  return {
    y: Number(matched[1]),
    m: Number(matched[2]) - 1,
    d: Number(matched[3]),
  };
}

export async function GET(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const subdomain = params.subdomain.trim().toLowerCase();
  const query = parseQuery(new URL(request.url));
  if (!query) {
    return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
  }

  const business = await prisma.business.findFirst({
    where: {
      subdomain,
      isDisabled: false,
      onboardingComplete: true,
    },
    include: {
      workingHours: { where: { staffMemberId: null } },
      holidays: { where: { staffMemberId: null } },
      services: { where: { id: query.serviceId, isActive: true } },
      staffMembers: {
        where: { isActive: true },
        include: {
          workingHours: true,
          offeredServices: { select: { id: true } },
        },
      },
      locations: { select: { id: true } },
    },
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const service = business.services[0];
  if (!service) {
    return NextResponse.json({ error: "Service not found." }, { status: 404 });
  }

  const multiLoc =
    hasPremiumFeatures(business.subscriptionTier) &&
    business.locations.length >= 2;

  if (multiLoc) {
    if (!query.businessLocationId) {
      return NextResponse.json(
        { error: "Choose a location to see availability." },
        { status: 422 },
      );
    }
    const locOk = business.locations.some((l) => l.id === query.businessLocationId);
    if (!locOk) {
      return NextResponse.json({ error: "Unknown location." }, { status: 404 });
    }
    if (
      service.businessLocationId &&
      service.businessLocationId !== query.businessLocationId
    ) {
      return NextResponse.json(
        { error: "This service is not offered at that location." },
        { status: 422 },
      );
    }
  }

  const eligibleStaff = multiLoc
    ? business.staffMembers.filter(
        (s) =>
          !query.businessLocationId ||
          !s.businessLocationId ||
          s.businessLocationId === query.businessLocationId,
      )
    : business.staffMembers;

  const holidayHit = business.holidays.some(
    (h) => h.dateStart.toISOString().slice(0, 10) === query.date,
  );
  if (holidayHit) {
    return NextResponse.json({ slots: [] });
  }

  let staffMemberId = query.staffMemberId ?? null;
  const staffSelectionRequired =
    business.allowCustomerStaffSelection && eligibleStaff.length > 0;

  if (staffSelectionRequired) {
    if (!staffMemberId) {
      return NextResponse.json(
        { error: "Select a staff member for this business." },
        { status: 422 },
      );
    }
    const staff = eligibleStaff.find((s) => s.id === staffMemberId);
    if (!staff) {
      return NextResponse.json({ error: "Unknown staff member." }, { status: 404 });
    }
    if (!staff.offeredServices.some((s) => s.id === service.id)) {
      return NextResponse.json(
        { error: "That teammate does not offer this service." },
        { status: 422 },
      );
    }
  } else {
    staffMemberId = null;
  }

  const parts = ymdParts(query.date);
  if (!parts) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const tz = business.timezone || "UTC";
  const rangeStart = new TZDate(parts.y, parts.m, parts.d, 0, 0, 0, 0, tz);
  const rangeEnd = new TZDate(parts.y, parts.m, parts.d, 23, 59, 59, 999, tz);

  const bookings = await prisma.booking.findMany({
    where: {
      businessId: business.id,
      status: BookingStatus.CONFIRMED,
      startsAt: { lt: new Date(rangeEnd.getTime()) },
      endsAt: { gt: new Date(rangeStart.getTime()) },
      ...(multiLoc && query.businessLocationId
        ? {
            OR: [
              { businessLocationId: query.businessLocationId },
              { businessLocationId: null },
            ],
          }
        : {}),
    },
    select: {
      startsAt: true,
      endsAt: true,
      staffMemberId: true,
    },
  });

  const businessIntervals = bookings.map((b) => ({
    startsAt: b.startsAt,
    endsAt: b.endsAt,
  }));

  const staffIntervals = staffMemberId
    ? bookings
        .filter(
          (b) =>
            b.staffMemberId === staffMemberId || b.staffMemberId === null,
        )
        .map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt }))
    : businessIntervals;

  const staffMember = staffMemberId
    ? eligibleStaff.find((s) => s.id === staffMemberId)
    : undefined;

  const staffWorkingSlices =
    staffMember?.workingHours.map((wh) => ({
      dayOfWeek: wh.dayOfWeek,
      openMinutes: wh.openMinutes,
      closeMinutes: wh.closeMinutes,
    })) ?? [];

  const businessWorkingSlices = business.workingHours.map((wh) => ({
    dayOfWeek: wh.dayOfWeek,
    openMinutes: wh.openMinutes,
    closeMinutes: wh.closeMinutes,
  }));

  const slots = buildAvailabilitySlots({
    calendarDate: query.date,
    timeZone: tz,
    slotMode: business.slotMode,
    bookingBufferMinutes: business.bookingBufferMinutes,
    serviceDurationMinutes: service.durationMinutes,
    businessWorkingHours: businessWorkingSlices,
    staffWorkingHours: staffWorkingSlices,
    existingBookings: businessIntervals,
    staffScopedBookings: staffMemberId ? staffIntervals : undefined,
    ignoreStaffHours: !staffMemberId,
  });

  return NextResponse.json({ slots });
}
