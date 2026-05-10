/** Copy-paste templates for Premium businesses (reminder tone + service blurbs). */

export type PremiumTemplate = {
  id: string;
  title: string;
  category: "reminder" | "service" | "sms";
  body: string;
};

export const PREMIUM_TEMPLATES: PremiumTemplate[] = [
  {
    id: "reminder-soft",
    title: "Gentle 24h reminder",
    category: "reminder",
    body: "Hi {name}, just a friendly reminder about your {service} with us tomorrow. If you need to reschedule, use the link in your confirmation email — we are happy to help.",
  },
  {
    id: "reminder-firm",
    title: "Short confirmation tone",
    category: "reminder",
    body: "Reminder: {service} booked for {date}. See you then — {business}.",
  },
  {
    id: "service-consult",
    title: "Consultation service blurb",
    category: "service",
    body: "A focused session to understand your goals, answer questions, and agree on next steps. Please arrive 5 minutes early so we can start on time.",
  },
  {
    id: "service-wellness",
    title: "Wellness / treatment blurb",
    category: "service",
    body: "Please wear comfortable clothing and avoid heavy meals in the hour before your visit. Let us know about any health considerations when you book.",
  },
  {
    id: "sms-ready",
    title: "SMS-style nudge",
    category: "sms",
    body: "Hi {name} — quick reminder: {service} on {date}. Reply if you need to move it. {business}",
  },
];
