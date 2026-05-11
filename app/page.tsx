import Link from "next/link";

import {
  MotionAmbientOrbs,
  MotionBottomCTA,
  MotionFAQItem,
  MotionFAQList,
  MotionFeatureCard,
  MotionFeatureGrid,
  MotionHeroBadge,
  MotionHeroCtas,
  MotionHeroSub,
  MotionHeroTitle,
  MotionIndustriesGrid,
  MotionIndustryChip,
  MotionMockWindow,
  MotionPricingStrip,
  MotionReveal,
  MotionSectionHeading,
  MotionTestimonialCard,
  MotionTestimonialsGrid,
} from "@/components/marketing/home-motion";
import { MarketingNav } from "@/components/marketing/marketing-nav";

/* ── Availability grid mock ── */
function AvailabilityMock() {
  const cells = Array.from({ length: 24 }, (_, i) => i);
  const booked = new Set([2, 3, 8, 9, 14, 15, 19, 20]);
  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
      {cells.map((i) => (
        <div
          key={i}
          className={`aspect-square rounded-lg transition-all duration-300 ${
            booked.has(i)
              ? "rz-slot-booked animate-rz-slot-pulse"
              : "bg-white/[0.05] hover:bg-white/[0.09] hover:scale-[1.03]"
          }`}
        />
      ))}
    </div>
  );
}

/* ── Feature cards ── */
const features = [
  {
    icon: "🗓️",
    title: "Your own booking page",
    body: "Customers book at yourname.reservezy.com — no app needed, works on any phone or computer.",
    wide: false,
  },
  {
    icon: "💳",
    title: "Take deposits upfront",
    body: "Collect a deposit or full payment at booking via Stripe. Reduce no-shows dramatically.",
    wide: false,
  },
  {
    icon: "⚡",
    title: "Real-time availability",
    body: "Always shows accurate open slots — respects working hours, holidays, buffer time, and staff rosters. Zero double bookings.",
    wide: true,
    mock: true,
  },
  {
    icon: "👥",
    title: "Staff & team management",
    body: "Add your team, set their hours, assign services. Customers can even choose their preferred person.",
    wide: false,
  },
  {
    icon: "💬",
    title: "Automated reminders",
    body: "Email and SMS sent automatically to you and your customers. No more manual chasing.",
    wide: false,
  },
  {
    icon: "📅",
    title: "Calendar sync",
    body: "Connects to Google Calendar and Outlook so your appointments appear alongside personal events.",
    wide: false,
  },
];

/* ── Industry tags ── */
const industries = [
  "Hair salon", "Barber", "Beauty & nails", "Massage",
  "Personal trainer", "Yoga & pilates", "Tattoo studio",
  "Consultant", "Life coach", "Physiotherapy", "Dentist",
  "Tutor", "Photographer", "Clinic", "Aesthetics",
];

/* ── FAQ ── */
const faq = [
  {
    q: "Do my customers need to download anything?",
    a: "No — they just visit your booking link in any browser and book in under a minute. No sign-up required on their end.",
  },
  {
    q: "What happens after I sign up?",
    a: "You are walked through an eight-step setup: branding, your hours, your services, staff, and billing. It takes about ten minutes.",
  },
  {
    q: "Can I try it before paying?",
    a: "Yes — start on the Basic plan and upgrade when you are ready. No card required to see how it works.",
  },
  {
    q: "Will it work alongside my existing calendar?",
    a: "Premium connects to Google Calendar and Microsoft Outlook so every booking lands there automatically.",
  },
];

/* ── Testimonials ── */
const testimonials = [
  {
    quote: "I stopped losing bookings overnight. Customers book while I am with another client.",
    author: "Sarah, hair salon owner",
  },
  {
    quote: "Setup was easy — even I managed it! My clients love being able to pick their slot online.",
    author: "Marcus, personal trainer",
  },
  {
    quote: "The deposit feature alone paid for itself in the first week.",
    author: "Priya, beauty therapist",
  },
];

export default function Home() {
  return (
    <div className="rz-radial-hero min-h-screen">
      <MarketingNav />

      {/* ── Hero ── */}
      <main>
        <section className="relative mx-auto max-w-4xl px-5 pb-16 pt-8 text-center sm:px-8 sm:pt-16 overflow-hidden">
          <MotionAmbientOrbs />

          <MotionHeroBadge>
            <div className="rz-badge mb-8 inline-flex">
              <span aria-hidden>✨</span>
              Smart scheduling for small businesses
            </div>
          </MotionHeroBadge>

          <MotionHeroTitle>
            Bookings that{" "}
            <span className="bg-gradient-to-r from-[#b0abff] via-[#8b86f9] to-[#7c6df8] bg-clip-text text-transparent">
              run themselves.
            </span>
          </MotionHeroTitle>

          <MotionHeroSub>
            Give your business its own booking page, take payments upfront, and send
            automatic reminders — without lifting a finger.
          </MotionHeroSub>

          <MotionHeroCtas>
            <Link href="/signup" className="rz-btn-primary px-8 py-3.5 text-base">
              Get started free <span aria-hidden>→</span>
            </Link>
            <Link href="/pricing" className="rz-btn-ghost px-8 py-3.5 text-base">
              See pricing
            </Link>
          </MotionHeroCtas>

          {/* Social proof */}
          <MotionReveal delay={0.32} className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-rz-subtle">
            <span className="flex items-center gap-1.5">
              <span className="text-yellow-400" aria-hidden>★★★★★</span>
              Trusted by growing businesses
            </span>
            <span className="hidden sm:block text-white/20">|</span>
            <span>No credit card to start</span>
            <span className="hidden sm:block text-white/20">|</span>
            <span>Cancel any time</span>
          </MotionReveal>
        </section>

        {/* ── Product mock ── */}
        <section
          className="relative mx-auto max-w-5xl px-5 pb-20 sm:px-8"
          aria-label="Dashboard preview"
        >
          <MotionMockWindow>
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-white/[0.07] bg-[#10102a] px-4 py-3">
              <span className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </span>
              <span className="flex-1 text-center font-mono text-xs text-rz-subtle">
                dashboard · reservezy.com
              </span>
            </div>
            {/* Dashboard preview content */}
            <div className="grid gap-4 p-5 sm:grid-cols-[1fr_1.25fr] sm:p-8">
              {/* Stat card */}
              <div className="space-y-4 rounded-xl border border-white/[0.07] bg-[#0f0f28]/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-rz-accent">Today</p>
                <p className="text-4xl font-bold text-white">12</p>
                <p className="text-sm text-rz-muted">Upcoming bookings</p>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#38bdf8] to-[#8b86f9]" />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[["Revenue", "£ 840"], ["This week", "54"]].map(([label, val]) => (
                    <div key={label} className="rounded-lg bg-white/[0.04] p-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-rz-subtle">{label}</p>
                      <p className="mt-0.5 text-base font-bold text-white">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Availability preview */}
              <div className="rounded-xl border border-white/[0.07] bg-[#0f0f28]/80 p-5">
                <p className="mb-4 text-sm font-medium text-rz-muted">Live availability</p>
                <AvailabilityMock />
                <p className="mt-3 text-xs text-rz-subtle">
                  <span className="inline-block h-2 w-2 rounded-sm bg-[#8b86f9] align-middle mr-1" />
                  Booked
                  <span className="ml-3 inline-block h-2 w-2 rounded-sm bg-white/[0.06] align-middle mr-1" />
                  Available
                </p>
              </div>
            </div>
          </MotionMockWindow>
        </section>

        {/* ── Features ── */}
        <section id="features" className="rz-radial-section border-t border-white/[0.05] py-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <MotionSectionHeading className="mx-auto max-w-2xl text-center">
              <p className="rz-badge mb-4 inline-flex">Everything you need</p>
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                A complete system for your business
              </h2>
              <p className="mt-4 text-base leading-relaxed text-rz-muted">
                Every feature you need to take bookings, manage your team, and grow — in one simple platform.
              </p>
            </MotionSectionHeading>

            <MotionFeatureGrid className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <MotionFeatureCard
                  key={f.title}
                  className={f.wide ? "sm:col-span-2 lg:col-span-2" : ""}
                >
                  <article className="rz-card-hover flex h-full flex-col gap-3 p-7">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8b86f9]/12 text-xl ring-1 ring-[#8b86f9]/25">
                      {f.icon}
                    </div>
                    <h3 className="text-[1.05rem] font-bold text-white">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-rz-muted">{f.body}</p>
                    {f.mock ? (
                      <div className="mt-3 rounded-xl border border-white/[0.06] bg-[#09091a]/70 p-4">
                        <AvailabilityMock />
                      </div>
                    ) : null}
                  </article>
                </MotionFeatureCard>
              ))}
            </MotionFeatureGrid>
          </div>
        </section>

        {/* ── Industries ── */}
        <section id="businesses" className="border-t border-white/[0.05] py-20">
          <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
            <MotionSectionHeading>
              <p className="rz-badge mb-4 inline-flex">Made for your industry</p>
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                Works for any service business
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-rz-muted">
                Pre-built templates get you set up in minutes with services, durations,
                and suggested prices — just tweak what you need.
              </p>
            </MotionSectionHeading>

            <MotionIndustriesGrid className="mt-10 flex flex-wrap justify-center gap-2.5">
              {industries.map((ind) => (
                <MotionIndustryChip
                  key={ind}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm font-medium text-rz-muted transition hover:border-[#8b86f9]/35 hover:bg-[#8b86f9]/10 hover:text-rz-accent"
                >
                  {ind}
                </MotionIndustryChip>
              ))}
            </MotionIndustriesGrid>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="border-t border-white/[0.05] py-20">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <MotionReveal className="mb-12 text-center">
              <h2 className="text-2xl font-bold text-white">
                Real businesses, real results
              </h2>
            </MotionReveal>

            <MotionTestimonialsGrid className="grid gap-5 sm:grid-cols-3">
              {testimonials.map((t) => (
                <MotionTestimonialCard key={t.author} className="rz-card p-6 cursor-default">
                  <p className="text-sm leading-relaxed text-rz-muted">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <footer className="mt-4 text-xs font-semibold text-rz-accent">
                    — {t.author}
                  </footer>
                </MotionTestimonialCard>
              ))}
            </MotionTestimonialsGrid>
          </div>
        </section>

        {/* ── Pricing CTA strip ── */}
        <section className="border-t border-white/[0.05] py-16">
          <MotionPricingStrip className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 px-5 sm:flex-row sm:px-8">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Simple, transparent pricing
              </h2>
              <p className="mt-2 text-base text-rz-muted">
                Basic £14.99 · Standard £29.99 · Premium £49.99 per month.
                No hidden fees.
              </p>
            </div>
            <Link
              href="/pricing"
              className="rz-btn-ghost shrink-0"
            >
              Compare plans →
            </Link>
          </MotionPricingStrip>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="border-t border-white/[0.05] py-20">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <MotionReveal className="mb-10 text-center">
              <h2 className="text-3xl font-extrabold text-white">
                Questions answered
              </h2>
            </MotionReveal>

            <MotionFAQList className="space-y-4">
              {faq.map((item) => (
                <MotionFAQItem
                  key={item.q}
                  className="rz-card px-6 py-5 transition-colors hover:border-[#8b86f9]/25"
                >
                  <dt className="font-bold text-white">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-rz-muted">{item.a}</dd>
                </MotionFAQItem>
              ))}
            </MotionFAQList>
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="border-t border-white/[0.05] py-24 text-center">
          <div className="mx-auto max-w-2xl px-5">
            <MotionBottomCTA>
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                Ready to fill your calendar?
              </h2>
              <p className="mx-auto mt-4 max-w-md text-base text-rz-muted">
                Set up your booking page in 10 minutes. No technical knowledge needed.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link href="/signup" className="rz-btn-primary px-8 py-4 text-base">
                  Start for free <span aria-hidden>→</span>
                </Link>
                <Link href="/login" className="rz-btn-ghost px-8 py-4 text-base">
                  Sign in
                </Link>
              </div>
            </MotionBottomCTA>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.05] py-12">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#8b86f9] to-[#6d66f0]">
                <span className="text-xs font-bold text-white">R</span>
              </div>
              <span className="text-sm font-semibold text-white">Reservezy</span>
            </div>
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-rz-subtle">
              <Link href="/#features" className="transition hover:text-white">Features</Link>
              <Link href="/pricing" className="transition hover:text-white">Pricing</Link>
              <Link href="/#businesses" className="transition hover:text-white">Industries</Link>
              <Link href="/#faq" className="transition hover:text-white">FAQ</Link>
              <Link href="/login" className="transition hover:text-white">Sign in</Link>
            </nav>
            <p className="text-xs text-rz-subtle">© 2026 Reservezy</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
