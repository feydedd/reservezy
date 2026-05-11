import type { Metadata } from "next";
import Link from "next/link";

import { MarketingNav } from "@/components/marketing/marketing-nav";

export const metadata: Metadata = {
  title: "Pricing — Reservezy",
};

const tiers = [
  {
    name: "Basic",
    price: "£14.99",
    period: "/month",
    tagline: "Perfect to get started",
    description:
      "Online bookings with an in-app checklist, referrals, internal notes, and promo codes.",
    featured: false,
    cta: "Start with Basic",
    bullets: [
      "Your own booking page (yourname.reservezy.com)",
      "Services, durations, and pricing",
      "Working hours & holiday blocks",
      "Owner dashboard with calendar & bookings list",
      "Buffer time between appointments",
      "In-app checklist to finish setup with confidence",
      "Referral tools to reward clients who bring friends",
      "Internal notes on bookings (team-only)",
      "Promo codes for campaigns and discounts",
    ],
  },
  {
    name: "Standard",
    price: "£29.99",
    period: "/month",
    tagline: "Most popular for growing businesses",
    description:
      "Everything in Basic, plus your team, notifications, client intake forms, and accounting exports.",
    featured: true,
    cta: "Start free trial",
    bullets: [
      "Email confirmations to you and your customer",
      "SMS notifications via Twilio",
      "Staff management with individual hours",
      "Customers can pick a preferred team member",
      "24-hour appointment reminders",
      "Client intake forms attached to bookings",
      "Export bookings & payments for accounting (CSV)",
    ],
  },
  {
    name: "Premium",
    price: "£49.99",
    period: "/month",
    tagline: "For ambitious businesses",
    description:
      "Everything in Standard, plus calendar sync, full branding, multi-location, and growth tools.",
    featured: false,
    cta: "Start free trial",
    bullets: [
      "Google Calendar & Outlook sync",
      "Full branding: logo, colours, font",
      "Customers can cancel & reschedule via link",
      "Advanced analytics and revenue charts",
      "Multi-location: separate calendars and staff per site",
      "Automated review prompts after appointments",
      "Template library for services and reminder copy",
      "Priority support",
    ],
  },
];

const faqs = [
  {
    q: "Can I change plans later?",
    a: "Absolutely — upgrade or downgrade any time. Changes take effect immediately via Stripe.",
  },
  {
    q: "Is there a free trial?",
    a: "Standard and Premium come with a 14-day free trial. Basic is available from day one with no payment needed.",
  },
  {
    q: "What payment methods are accepted?",
    a: "All major debit and credit cards via Stripe. No bank transfers or invoices at this time.",
  },
];

export default function PricingPage() {
  return (
    <div className="rz-radial-section min-h-screen">
      <MarketingNav />

      <main className="mx-auto max-w-6xl px-5 pb-28 pt-12 sm:px-8">
        {/* Header */}
        <header className="mx-auto max-w-2xl text-center">
          <p className="rz-badge mb-5 inline-flex">Pricing</p>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Simple pricing.{" "}
            <span className="bg-gradient-to-r from-[#b0abff] to-[#8b86f9] bg-clip-text text-transparent">
              Serious value.
            </span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-rz-muted sm:text-lg">
            No hidden fees. Cancel any time. Every plan pays for itself in
            recovered no-show appointments.
          </p>
        </header>

        {/* Tier cards */}
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <article
              key={tier.name}
              className={`relative flex flex-col rounded-3xl p-8 ${
                tier.featured
                  ? "border border-[#8b86f9]/50 bg-[#13132c] shadow-[0_0_0_1px_rgba(139,134,249,0.2),0_24px_60px_rgba(0,0,0,0.5)]"
                  : "rz-card"
              }`}
            >
              {tier.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-[#8b86f9] to-[#6d66f0] px-5 py-1.5 text-xs font-bold text-white shadow-lg shadow-[#6d66f0]/30">
                  Most popular
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">{tier.name}</h2>
                <p className="mt-1 text-xs font-medium text-rz-accent">{tier.tagline}</p>
                <p className="mt-3 text-sm text-rz-muted">{tier.description}</p>
              </div>

              <div className="flex items-end gap-1">
                <span className="text-5xl font-extrabold leading-none text-white">{tier.price}</span>
                <span className="mb-1 text-sm text-rz-subtle">{tier.period}</span>
              </div>

              <Link
                href="/signup"
                className={`mt-8 block w-full rounded-full py-3.5 text-center text-sm font-bold transition ${
                  tier.featured
                    ? "rz-glow bg-gradient-to-r from-[#8b86f9] to-[#6d66f0] text-white hover:brightness-110"
                    : "border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                }`}
              >
                {tier.cta}
              </Link>

              <ul className="mt-8 space-y-3.5">
                {tier.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3 text-sm text-rz-muted">
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#8b86f9]/15 text-[10px] font-bold text-rz-accent"
                      aria-hidden
                    >
                      ✓
                    </span>
                    {bullet}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        {/* FAQ */}
        <section className="mt-20">
          <h2 className="mb-8 text-center text-2xl font-extrabold text-white">
            Pricing questions
          </h2>
          <dl className="mx-auto max-w-2xl space-y-4">
            {faqs.map((item) => (
              <div key={item.q} className="rz-card px-6 py-5">
                <dt className="font-bold text-white">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-rz-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}
