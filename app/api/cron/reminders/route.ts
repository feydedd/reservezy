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
import { sendCustomerReminder, sendReviewPromptEmail } from "@/lib/email/resend";
import { sendBookingReminderSms } from "@/lib/sms/twilio";
import { hasSmsFeatures } from "@/lib/subscription/tiers";

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

      if (
        hasSmsFeatures(booking.business.subscriptionTier) &&
        booking.customer.phone
      ) {
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

  /* ── Review prompts (Premium): completed visits, 1–6h after end time ── */
  const reviewWindowStart = addMinutes(new Date(), -360);
  const reviewWindowEnd = addMinutes(new Date(), -60);

  const reviewCandidates = await prisma.booking.findMany({
    where: {
      status: BookingStatus.COMPLETED,
      reviewPromptSentAt: null,
      endsAt: { gte: reviewWindowStart, lte: reviewWindowEnd },
      business: {
        subscriptionTier: "PREMIUM",
        reviewPromptEnabled: true,
        isDisabled: false,
        reviewUrl: { not: null },
      },
    },
    include: {
      customer: { select: { email: true, fullName: true } },
      service: { select: { name: true } },
      business: {
        select: {
          name: true,
          reviewUrl: true,
        },
      },
    },
    take: 50,
  });

  let reviewSent = 0;
  for (const b of reviewCandidates) {
    const url = b.business.reviewUrl;
    if (!url || !url.startsWith("http")) {
      continue;
    }
    try {
      await sendReviewPromptEmail({
        customerEmail: b.customer.email,
        customerFirstName: b.customer.fullName.split(/\s+/)[0] ?? "there",
        businessName: b.business.name,
        serviceName: b.service.name,
        reviewUrl: url,
      });
      await prisma.booking.update({
        where: { id: b.id },
        data: { reviewPromptSentAt: new Date() },
      });
      reviewSent++;
    } catch (err) {
      console.error("[reminders] review prompt failed", b.id, err);
    }
  }

  return jsonOk({
    processed: bookings.length,
    sent,
    errors,
    reviewPromptsSent: reviewSent,
    window: { from: windowStart.toISOString(), to: windowEnd.toISOString() },
  });
}
