/**
 * GET /api/cron/reminders
 * Sends 24-hour appointment reminders via email.
 * Should be called by a Vercel Cron job or external scheduler once per hour.
 *
 * Secured by CRON_SECRET env var (set in Vercel project settings).
 * Vercel config (vercel.json):
 *   "crons": [{ "path": "/api/cron/reminders", "schedule": "0 * * * *" }]
 */

import { addHours, subMinutes, addMinutes } from "date-fns";
import { BookingStatus } from "@prisma/client";

import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { sendCustomerReminder } from "@/lib/email/resend";
import { sendBookingReminderSms } from "@/lib/sms/twilio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  // Verify cron secret
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return jsonError("Unauthorised.", 401);
    }
  }

  // Find bookings starting in ~24 hours (window: 23h55m → 24h05m from now)
  const windowStart = subMinutes(addHours(new Date(), 24), 5);
  const windowEnd = addMinutes(addHours(new Date(), 24), 5);

  const bookings = await prisma.booking.findMany({
    where: {
      status: BookingStatus.CONFIRMED,
      startsAt: { gte: windowStart, lte: windowEnd },
      reminderEmailSentAt: null,
      business: {
        // Only Standard+ get email reminders
        subscriptionTier: { in: ["STANDARD", "PREMIUM"] },
        isDisabled: false,
      },
    },
    include: {
      customer: { select: { email: true, fullName: true, phone: true } },
      service: { select: { name: true } },
      business: {
        select: {
          name: true,
          allowCustomerCancelReschedule: true,
          subscriptionTier: true,
          timezone: true,
        },
      },
    },
    take: 100,
  });

  let sent = 0;
  const errors: string[] = [];

  for (const booking of bookings) {
    try {
      await sendCustomerReminder({
        customerEmail: booking.customer.email,
        customerFullName: booking.customer.fullName,
        businessName: booking.business.name,
        serviceName: booking.service.name,
        startsAt: booking.startsAt,
        managementToken: booking.managementToken,
        allowCancelReschedule: booking.business.allowCustomerCancelReschedule,
      });

      // SMS reminder for Premium tier customers who have a phone number
      if (booking.business.subscriptionTier === "PREMIUM" && booking.customer.phone) {
        sendBookingReminderSms({
          customerName: booking.customer.fullName,
          customerPhone: booking.customer.phone,
          businessName: booking.business.name,
          serviceName: booking.service.name,
          startTime: booking.startsAt,
          timezone: booking.business.timezone,
        }).catch(() => null);
      }

      // Mark as sent so we don't double-send
      await prisma.booking.update({
        where: { id: booking.id },
        data: { reminderEmailSentAt: new Date() },
      });

      sent++;
    } catch (err) {
      errors.push(booking.id);
      console.error("[reminders] failed for booking", booking.id, err);
    }
  }

  return jsonOk({
    processed: bookings.length,
    sent,
    errors,
    window: { from: windowStart.toISOString(), to: windowEnd.toISOString() },
  });
}
