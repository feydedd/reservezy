import { TZDate } from "@date-fns/tz";

import type { SlotMode } from "@prisma/client";

export type WorkingHourSlice = {
  dayOfWeek: number;
  openMinutes: number;
  closeMinutes: number;
};

export type BookingInterval = {
  startsAt: Date;
  endsAt: Date;
};

function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
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

export function weekdayInBusinessZone(
  ymd: string,
  timeZone: string,
): number | null {
  const parts = parseYmd(ymd);
  if (!parts) {
    return null;
  }
  return new TZDate(parts.y, parts.m, parts.d, 12, 0, timeZone).getDay();
}

function minutesToHm(totalMinutes: number): { h: number; min: number } {
  return {
    h: Math.floor(totalMinutes / 60),
    min: totalMinutes % 60,
  };
}

function instantForLocalMinutes(
  ymd: string,
  openMinutes: number,
  timeZone: string,
): Date | null {
  const parts = parseYmd(ymd);
  if (!parts) {
    return null;
  }
  const { h, min } = minutesToHm(openMinutes);
  return new TZDate(parts.y, parts.m, parts.d, h, min, 0, 0, timeZone);
}

function paddedOverlap(
  slotStart: Date,
  slotEnd: Date,
  booking: BookingInterval,
  bufferMinutes: number,
): boolean {
  const padMs = bufferMinutes * 60 * 1000;
  const bStart = booking.startsAt.getTime() - padMs;
  const bEnd = booking.endsAt.getTime() + padMs;
  const s = slotStart.getTime();
  const e = slotEnd.getTime();
  return s < bEnd && e > bStart;
}

function selectWorkingSlice(
  dayOfWeek: number,
  businessHours: WorkingHourSlice[],
  staffHours: WorkingHourSlice[],
): WorkingHourSlice | null {
  const staffMatch = staffHours.find((row) => row.dayOfWeek === dayOfWeek);
  if (staffMatch) {
    return staffMatch;
  }
  return businessHours.find((row) => row.dayOfWeek === dayOfWeek) ?? null;
}

export type SlotCandidate = {
  startsAt: string;
  endsAt: string;
};

export function buildAvailabilitySlots(params: {
  calendarDate: string;
  timeZone: string;
  slotMode: SlotMode;
  bookingBufferMinutes: number;
  serviceDurationMinutes: number;
  businessWorkingHours: WorkingHourSlice[];
  staffWorkingHours: WorkingHourSlice[];
  existingBookings: BookingInterval[];
  /** When set, only conflicts with these bookings count */
  staffScopedBookings?: BookingInterval[];
  /** When true, ignore staff hours and use business hours only */
  ignoreStaffHours?: boolean;
}): SlotCandidate[] {
  const {
    calendarDate,
    timeZone,
    slotMode,
    bookingBufferMinutes,
    serviceDurationMinutes,
    businessWorkingHours,
    staffWorkingHours,
    existingBookings,
    staffScopedBookings,
    ignoreStaffHours,
  } = params;

  const dayOfWeek = weekdayInBusinessZone(calendarDate, timeZone);
  if (dayOfWeek === null) {
    return [];
  }

  const slice = ignoreStaffHours
    ? businessWorkingHours.find((row) => row.dayOfWeek === dayOfWeek) ?? null
    : selectWorkingSlice(dayOfWeek, businessWorkingHours, staffWorkingHours);

  if (!slice || slice.closeMinutes <= slice.openMinutes) {
    return [];
  }

  const windowStart = instantForLocalMinutes(
    calendarDate,
    slice.openMinutes,
    timeZone,
  );
  const windowEnd = instantForLocalMinutes(
    calendarDate,
    slice.closeMinutes,
    timeZone,
  );

  if (!windowStart || !windowEnd) {
    return [];
  }

  const stepMinutes = slotMode === "FIXED" ? 30 : 15;
  const conflicts = staffScopedBookings ?? existingBookings;

  const slots: SlotCandidate[] = [];
  let cursor = windowStart.getTime();
  const endLimit = windowEnd.getTime();
  const durationMs = serviceDurationMinutes * 60 * 1000;

  while (cursor + durationMs <= endLimit) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(cursor + durationMs);

    const blocked = conflicts.some((booking) =>
      paddedOverlap(slotStart, slotEnd, booking, bookingBufferMinutes),
    );

    if (!blocked) {
      slots.push({
        startsAt: slotStart.toISOString(),
        endsAt: slotEnd.toISOString(),
      });
    }

    cursor += stepMinutes * 60 * 1000;
  }

  return slots;
}
