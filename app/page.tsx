import Link from "next/link";
import dynamic from "next/dynamic";

import {
  MotionAmbientOrbs,
  MotionBottomCTA,
  MotionFAQItem,
  MotionFAQList,
  MotionFeatureCard,
  MotionFeatureGrid,
  MotionHeroBadge,
  MotionHeroCtas,
  MotionHeroParallax,
  MotionHeroSub,
  MotionHeroTitle,
  MotionIndustriesGrid,
  MotionIndustryChip,
  MotionParallaxLayer,
  MotionPricingStrip,
  MotionReveal,
  MotionSectionHeading,
  MotionTestimonialCard,
  MotionTestimonialsGrid,
} from "@/components/marketing/home-motion";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { SmoothScrollProvider } from "@/components/marketing/smooth-scroll-provider";

/** Keep in sync with `PINNED_BOOKING_SECTION_VH` in pinned-booking-demo (loading skeleton height). */
const PINNED_BOOKING_DEMO_VH = 560;

const PinnedBookingDemo = dynamic(
  () => import("@/components/marketing/pinned-booking-demo"),
  {
    ssr: false,
    loading: () => (
      <section
        aria-hidden
        className="relative flex justify-center bg-[#050510] py-16"
        style={{ minHeight: `${PINNED_BOOKING_DEMO_VH}vh` }}
      >
        <div className="sticky top-24 h-[min(72vh,640px)] w-full max-w-[min(100%,300px)] animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.04] sm:max-w-[340px] lg:max-w-[400px]" />
      </section>
    ),
  },
);

/* ── Features ── */
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

/* ── Industries ── */
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
      <SmoothScrollProvider />
      <MarketingNav />

      <main>
        {/* ══ Hero ══════════════════════════════════════════════════ */}
        <section className="relative mx-auto max-w-4xl overflow-hidden px-5 pb-24 pt-8 text-center sm:px-8 sm:pt-16">
          <MotionAmbientOrbs />

          <MotionHeroParallax>
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

            <MotionReveal delay={0.45} className="mt-16 flex justify-center">
              <div className="flex flex-col items-center gap-2 text-xs uppercase tracking-widest text-rz-subtle">
                <span>Scroll to explore</span>
                <span className="flex h-9 w-5 items-start justify-center rounded-full border border-white/15 p-1">
                  <span className="block h-1.5 w-1 animate-bounce rounded-full bg-rz-accent" />
                </span>
              </div>
            </MotionReveal>
          </MotionHeroParallax>
        </section>

        {/* ══ Centrepiece: scroll-scrubbed booking story (calendar → live grid → times → pay) ═══ */}
        <div className="relative border-t border-white/[0.06] bg-gradient-to-b from-transparent via-[#8b86f9]/[0.03] to-transparent py-6 sm:py-10">
          <div className="mx-auto max-w-2xl px-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rz-subtle">
              Keep scrolling
            </p>
            <p className="mt-2 text-sm text-rz-muted sm:text-base">
              The preview below is <span className="font-semibold text-white">scroll-driven</span> — your colours, your vibe, one fluid customer journey.
            </p>
          </div>
        </div>
        <PinnedBookingDemo />

        {/* ══ Features (parallax + stagger) ═════════════════════════ */}
        <section id="features" className="rz-radial-section relative overflow-hidden border-t border-white/[0.05] py-28">
          {/* Drifting backdrop blobs */}
          <MotionParallaxLayer speed={-0.3} className="pointer-events-none absolute inset-0">
            <div className="absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-[#8b86f9]/8 blur-[100px]" />
            <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-[#6d66f0]/8 blur-[90px]" />
          </MotionParallaxLayer>

          <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
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
                  </article>
                </MotionFeatureCard>
              ))}
            </MotionFeatureGrid>
          </div>
        </section>

        {/* ══ Industries (chips with stagger) ═══════════════════════ */}
        <section id="businesses" className="relative overflow-hidden border-t border-white/[0.05] py-24">
          <MotionParallaxLayer speed={0.2} className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-[#38bdf8]/6 blur-[100px]" />
          </MotionParallaxLayer>

          <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8">
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

        {/* ══ Testimonials ══════════════════════════════════════════ */}
        <section className="relative border-t border-white/[0.05] py-24">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <MotionReveal className="mb-14 text-center">
              <h2 className="text-3xl font-extrabold text-white">
                Real businesses, real results
              </h2>
              <p className="mx-auto mt-3 max-w-md text-base text-rz-muted">
                Owners like you turning Reservezy into bookings.
              </p>
            </MotionReveal>

            <MotionTestimonialsGrid className="grid gap-5 sm:grid-cols-3">
              {testimonials.map((t) => (
                <MotionTestimonialCard
                  key={t.author}
                  className="rz-card cursor-default p-6 transition-shadow hover:shadow-[0_24px_60px_rgba(0,0,0,0.4)]"
                >
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

        {/* ══ Pricing CTA ═══════════════════════════════════════════ */}
        <section className="border-t border-white/[0.05] py-20">
          <MotionPricingStrip className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 px-5 sm:flex-row sm:px-8">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                Simple, transparent pricing
              </h2>
              <p className="mt-2 text-base text-rz-muted">
                Basic £14.99 · Standard £29.99 · Premium £49.99 per month.
                No hidden fees.
              </p>
            </div>
            <Link href="/pricing" className="rz-btn-ghost shrink-0">
              Compare plans →
            </Link>
          </MotionPricingStrip>
        </section>

        {/* ══ FAQ ═══════════════════════════════════════════════════ */}
        <section id="faq" className="border-t border-white/[0.05] py-24">
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

        {/* ══ Bottom CTA ════════════════════════════════════════════ */}
        <section className="relative overflow-hidden border-t border-white/[0.05] py-28 text-center">
          <MotionParallaxLayer speed={-0.25} className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8b86f9]/10 blur-[120px]" />
          </MotionParallaxLayer>

          <div className="relative mx-auto max-w-2xl px-5">
            <MotionBottomCTA>
              <h2 className="text-4xl font-extrabold text-white sm:text-5xl">
                Ready to fill your calendar?
              </h2>
              <p className="mx-auto mt-5 max-w-md text-base text-rz-muted">
                Set up your booking page in 10 minutes. No technical knowledge needed.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
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

      {/* ══ Footer ══════════════════════════════════════════════════ */}
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
              <Link href="/#features"   className="transition hover:text-white">Features</Link>
              <Link href="/pricing"     className="transition hover:text-white">Pricing</Link>
              <Link href="/#businesses" className="transition hover:text-white">Industries</Link>
              <Link href="/#faq"        className="transition hover:text-white">FAQ</Link>
              <Link href="/login"       className="transition hover:text-white">Sign in</Link>
            </nav>
            <p className="text-xs text-rz-subtle">© 2026 Reservezy</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
