/**
 * Email sending via Resend.
 * All sends are best-effort: we log errors but never throw to the caller —
 * a failed email should never prevent a booking from being confirmed.
 */

import { Resend } from "resend";

export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.trim() === "") return null;
  return new Resend(key);
}

const FROM =
  process.env.RESEND_FROM_EMAIL ?? "Reservezy <noreply@reservezy.com>";

function formatMoney(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}

/* ── Types ──────────────────────────────────── */

export type BookingEmailPayload = {
  bookingId: string;
  managementToken: string;
  businessName: string;
  businessSubdomain: string;
  ownerEmail: string;
  serviceName: string;
  durationMinutes: number;
  pricePence: number;
  startsAt: Date;
  endsAt: Date;
  customerFullName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
  allowCancelReschedule: boolean;
  /** Friend-referral link including this customer’s ?ref= token */
  referralShareUrl?: string;
};

/* ── Shared HTML wrapper ────────────────────── */

function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f8; margin: 0; padding: 0; }
    .wrap { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #8b86f9, #6d66f0); padding: 32px 32px 24px; color: #fff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .header p { margin: 6px 0 0; font-size: 14px; opacity: 0.85; }
    .body { padding: 28px 32px; }
    .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #7c6df8; margin-bottom: 2px; }
    .value { font-size: 15px; color: #1e1e2e; margin-bottom: 16px; }
    .divider { border: none; border-top: 1px solid #ebebf0; margin: 20px 0; }
    .cta { display: inline-block; background: #7c6df8; color: #fff; padding: 12px 24px; border-radius: 100px; text-decoration: none; font-weight: 700; font-size: 14px; margin-top: 8px; }
    .footer { padding: 16px 32px; background: #f9f9fc; font-size: 12px; color: #9090a8; text-align: center; }
    .note { background: #f3f2ff; border-left: 3px solid #8b86f9; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #4b4880; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="wrap">
    ${body}
    <div class="footer">Reservezy · Booking platform for small businesses</div>
  </div>
</body>
</html>`;
}

/* ── Customer confirmation email ─────────────── */

export async function sendCustomerConfirmation(
  p: BookingEmailPayload,
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const manageUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://reservezy.com"}/manage/${p.managementToken}`;

  const html = wrapHtml(
    `Booking confirmed — ${p.businessName}`,
    `<div class="header">
       <h1>You're booked in! 🎉</h1>
       <p>${p.businessName}</p>
     </div>
     <div class="body">
       <div class="label">Service</div>
       <div class="value">${p.serviceName} &middot; ${p.durationMinutes} min &middot; ${formatMoney(p.pricePence)}</div>
       <div class="label">Date &amp; time</div>
       <div class="value">${formatDateTime(p.startsAt)}</div>
       <div class="label">Reference</div>
       <div class="value" style="font-family:monospace;font-size:13px">${p.bookingId}</div>
       ${p.notes ? `<div class="label">Your notes</div><div class="value">${p.notes}</div>` : ""}
       ${
         p.referralShareUrl
           ? `<div class="note" style="margin-top:20px">Know someone who would love ${p.businessName}? Share your personal booking link — when they book, we will attribute the referral:<br/><br/><a href="${p.referralShareUrl}" style="word-break:break-all;color:#6d66f0;font-weight:600">${p.referralShareUrl}</a></div>`
           : ""
       }
       <hr class="divider" />
       ${
         p.allowCancelReschedule
           ? `<div class="note">Need to change plans? You can cancel or reschedule your appointment online. Your private management link is below — keep it safe.</div>
              <a href="${manageUrl}" class="cta">Manage my booking →</a>`
           : `<div class="note">To cancel or reschedule, please contact ${p.businessName} directly.</div>`
       }
     </div>`,
  );

  const text = [
    `Booking confirmed — ${p.businessName}`,
    "",
    `Service: ${p.serviceName} (${p.durationMinutes} min) — ${formatMoney(p.pricePence)}`,
    `When: ${formatDateTime(p.startsAt)}`,
    `Reference: ${p.bookingId}`,
    p.notes ? `Notes: ${p.notes}` : "",
    p.referralShareUrl ? `Refer a friend: ${p.referralShareUrl}` : "",
    "",
    p.allowCancelReschedule
      ? `Manage your booking: ${manageUrl}`
      : `To cancel, contact ${p.businessName} directly.`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await resend.emails.send({
      from: FROM,
      to: p.customerEmail,
      subject: `Booking confirmed — ${p.serviceName} at ${p.businessName}`,
      html,
      text,
    });
  } catch (err) {
    console.error("[resend] customer confirmation failed", err);
  }
}

/* ── Owner notification email ────────────────── */

export async function sendOwnerNotification(
  p: BookingEmailPayload,
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://reservezy.com"}/dashboard/bookings`;

  const html = wrapHtml(
    `New booking — ${p.customerFullName}`,
    `<div class="header">
       <h1>New booking 📅</h1>
       <p>${p.businessName}</p>
     </div>
     <div class="body">
       <div class="label">Customer</div>
       <div class="value">${p.customerFullName} &middot; ${p.customerEmail}${p.customerPhone ? ` &middot; ${p.customerPhone}` : ""}</div>
       <div class="label">Service</div>
       <div class="value">${p.serviceName} &middot; ${p.durationMinutes} min &middot; ${formatMoney(p.pricePence)}</div>
       <div class="label">Date &amp; time</div>
       <div class="value">${formatDateTime(p.startsAt)}</div>
       <div class="label">Booking reference</div>
       <div class="value" style="font-family:monospace;font-size:13px">${p.bookingId}</div>
       ${p.notes ? `<div class="label">Customer notes</div><div class="value">${p.notes}</div>` : ""}
       <hr class="divider" />
       <a href="${dashboardUrl}" class="cta">View in dashboard →</a>
     </div>`,
  );

  try {
    await resend.emails.send({
      from: FROM,
      to: p.ownerEmail,
      subject: `New booking: ${p.customerFullName} — ${p.serviceName} on ${formatDateTime(p.startsAt)}`,
      html,
      text: `New booking from ${p.customerFullName}\n\nService: ${p.serviceName}\nWhen: ${formatDateTime(p.startsAt)}\nRef: ${p.bookingId}\n\nDashboard: ${dashboardUrl}`,
    });
  } catch (err) {
    console.error("[resend] owner notification failed", err);
  }
}

/* ── Reminder email (called by cron) ────────── */

export async function sendCustomerReminder(payload: {
  customerEmail: string;
  customerFullName: string;
  businessName: string;
  serviceName: string;
  startsAt: Date;
  managementToken: string;
  allowCancelReschedule: boolean;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const manageUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://reservezy.com"}/manage/${payload.managementToken}`;

  const html = wrapHtml(
    `Reminder: ${payload.serviceName} tomorrow`,
    `<div class="header">
       <h1>See you tomorrow! ⏰</h1>
       <p>${payload.businessName}</p>
     </div>
     <div class="body">
       <p style="font-size:15px;color:#1e1e2e">Hi ${payload.customerFullName.split(" ")[0]},<br/><br/>
       Just a reminder that you have <strong>${payload.serviceName}</strong> booked at <strong>${payload.businessName}</strong>
       on <strong>${formatDateTime(payload.startsAt)}</strong>.</p>
       ${
         payload.allowCancelReschedule
           ? `<a href="${manageUrl}" class="cta">Manage booking →</a>`
           : ""
       }
     </div>`,
  );

  try {
    await resend.emails.send({
      from: FROM,
      to: payload.customerEmail,
      subject: `Reminder: ${payload.serviceName} at ${payload.businessName} tomorrow`,
      html,
      text: `Hi ${payload.customerFullName.split(" ")[0]},\n\nReminder: ${payload.serviceName} at ${payload.businessName} on ${formatDateTime(payload.startsAt)}.\n${payload.allowCancelReschedule ? `\nManage: ${manageUrl}` : ""}`,
    });
  } catch (err) {
    console.error("[resend] reminder failed", err);
  }
}

/* ── Admin plan grant notification ─────────────── */

export async function sendPlanGrantEmail(payload: {
  ownerEmail: string;
  ownerName: string;
  businessName: string;
  tier: string;
  expiresAt: Date;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://reservezy.com"}/dashboard`;
  const tierLabel = payload.tier === "PREMIUM" ? "Premium" : payload.tier === "STANDARD" ? "Standard" : "Basic";
  const tierColor = payload.tier === "PREMIUM" ? "#fbbf24" : payload.tier === "STANDARD" ? "#a5a0ff" : "#8b86f9";

  const html = wrapHtml(
    `Your ${tierLabel} plan is now active — Reservezy`,
    `<div class="header" style="background:linear-gradient(135deg,${tierColor},#6d66f0)">
       <h1>Your plan has been upgraded! 🎉</h1>
       <p>${payload.businessName}</p>
     </div>
     <div class="body">
       <p style="font-size:15px;color:#1e1e2e">Hi ${payload.ownerName.split(" ")[0]},</p>
       <p style="font-size:15px;color:#1e1e2e">Great news — your Reservezy account for <strong>${payload.businessName}</strong> has been upgraded to the <strong style="color:${tierColor}">${tierLabel} plan</strong>.</p>
       <div class="label">Plan active until</div>
       <div class="value">${payload.expiresAt.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
       <div class="note">Log in to your dashboard to start using all your new ${tierLabel} features.</div>
       <a href="${dashboardUrl}" class="cta">Go to dashboard →</a>
     </div>`,
  );

  try {
    await resend.emails.send({
      from: FROM,
      to: payload.ownerEmail,
      subject: `Your Reservezy ${tierLabel} plan is now active`,
      html,
      text: `Hi ${payload.ownerName.split(" ")[0]},\n\nYour Reservezy account (${payload.businessName}) has been upgraded to the ${tierLabel} plan, active until ${payload.expiresAt.toLocaleDateString("en-GB")}.\n\nLog in: ${dashboardUrl}`,
    });
  } catch (err) {
    console.error("[resend] plan grant email failed", err);
  }
}

/* ── Post-visit review prompt (Premium, cron) ───────── */

export async function sendReviewPromptEmail(payload: {
  customerEmail: string;
  customerFirstName: string;
  businessName: string;
  serviceName: string;
  reviewUrl: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const html = wrapHtml(
    `How was your visit? — ${payload.businessName}`,
    `<div class="header">
       <h1>We would love your feedback</h1>
       <p>${payload.businessName}</p>
     </div>
     <div class="body">
       <p style="font-size:15px;color:#1e1e2e">Hi ${payload.customerFirstName},<br/><br/>
       Thanks for visiting for <strong>${payload.serviceName}</strong>. If you have a moment, leaving a short review helps other clients discover ${payload.businessName}.</p>
       <a href="${payload.reviewUrl}" class="cta">Leave a review →</a>
     </div>`,
  );

  try {
    await resend.emails.send({
      from: FROM,
      to: payload.customerEmail,
      subject: `How was ${payload.serviceName}? — ${payload.businessName}`,
      html,
      text: `Hi ${payload.customerFirstName},\n\nThanks for visiting ${payload.businessName}. Leave a review: ${payload.reviewUrl}`,
    });
  } catch (err) {
    console.error("[resend] review prompt failed", err);
  }
}
