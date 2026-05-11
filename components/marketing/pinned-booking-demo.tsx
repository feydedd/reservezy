"use client";

import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Pinned scroll-scrubbed booking-flow demo — the homepage centrepiece.
 *
 * A laptop-style device stays fixed in the viewport while four scenes play
 * out as the user scrolls:
 *
 *   1.  Pick a service        — cards stagger in
 *   2.  Pick a date           — calendar grid fills up with bookings (★)
 *   3.  Pick a time slot      — time pills light up
 *   4.  Confirm + pay         — checkout summary slides in
 *
 * On mobile (or with prefers-reduced-motion) the section degrades to a
 * static stacked summary.
 */

const SCENES = ["Pick a service", "Pick a date", "Choose a time", "Confirm & pay"];

/* Scene 2 (calendar) is intentionally wide — ~35% of total pinned-section scroll. */
const SCENE_RANGES: Array<[number, number]> = [
  [0.00, 0.14], // services — snappy intro
  [0.17, 0.52], // calendar + availability fill (long runway)
  [0.55, 0.75], // time slots
  [0.78, 0.97], // confirm
];

/** Total scroll height of the pinned block (more vh = slower, more luxurious scrub). */
const PIN_SECTION_VH = 520;

/* ── Scene-level helpers ─────────────────────────────────────────────── */
function useSceneOpacity(progress: MotionValue<number>, index: number) {
  const [start, end] = SCENE_RANGES[index];
  return useTransform(progress, [start - 0.04, start, end, end + 0.04], [0, 1, 1, 0]);
}

function useSceneScale(progress: MotionValue<number>, index: number) {
  const [start, end] = SCENE_RANGES[index];
  const mid = (start + end) / 2;
  return useTransform(progress, [start - 0.04, mid, end + 0.04], [0.96, 1, 0.96]);
}

/* ─────────────────────────────────────────────────────────────────────
 * Scene 1 — Service cards
 * ───────────────────────────────────────────────────────────────────── */
type Service = { name: string; price: string; dur: string; emoji: string };

const SERVICES: Service[] = [
  { name: "Cut & finish",   price: "£45", dur: "45 min", emoji: "✂️" },
  { name: "Hair colouring", price: "£90", dur: "90 min", emoji: "🎨" },
  { name: "Beard trim",     price: "£18", dur: "20 min", emoji: "🧔" },
];

function ServiceCard({
  service, index, progress, selected,
}: {
  service: Service;
  index: number;
  progress: MotionValue<number>;
  selected: boolean;
}) {
  const [start] = SCENE_RANGES[0];
  const op = useTransform(
    progress,
    [start - 0.02, start + 0.04 + index * 0.04, start + 0.06 + index * 0.04],
    [0, 0, 1],
  );
  const y = useTransform(progress, [start - 0.02, start + 0.06 + index * 0.04], [16, 0]);

  return (
    <motion.div
      style={{ opacity: op, y }}
      className={`flex items-center gap-3 rounded-xl border p-3 ${
        selected
          ? "border-[#8b86f9]/55 bg-[#8b86f9]/10 shadow-[0_0_0_1px_rgba(139,134,249,0.25)]"
          : "border-white/[0.07] bg-white/[0.03]"
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-base">
        {service.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{service.name}</p>
        <p className="text-xs text-rz-subtle">{service.dur}</p>
      </div>
      <span className="text-sm font-bold text-white">{service.price}</span>
      {selected && (
        <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#8b86f9] text-[11px] font-bold text-white">
          ✓
        </span>
      )}
    </motion.div>
  );
}

function ServiceCardsScene({ progress }: { progress: MotionValue<number> }) {
  const opacity = useSceneOpacity(progress, 0);
  const scale   = useSceneScale(progress, 0);

  return (
    <motion.div
      style={{ opacity, scale }}
      className="absolute inset-0 flex flex-col gap-3 p-6 sm:p-8"
      aria-hidden
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-rz-accent">Step 1 of 4</p>
      <h3 className="text-lg font-bold text-white sm:text-xl">Choose a service</h3>
      <div className="mt-2 grid gap-2.5">
        {SERVICES.map((s, i) => (
          <ServiceCard key={s.name} service={s} index={i} progress={progress} selected={i === 0} />
        ))}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Scene 2 — Calendar grid filling up (★)
 * ───────────────────────────────────────────────────────────────────── */
const CAL_TOTAL  = 42;
const CAL_TODAY  = 8;
const CAL_PICK   = 17;
const CAL_BOOKED = new Set([3, 6, 9, 10, 14, 16, 21, 22, 23, 27, 30, 33, 35, 36, 39]);

/** Tiny “live booking” label that pops when a booked cell locks in during the scrub. */
const BOOKED_POP: Record<number, { initial: string; name: string }> = {
  3:  { initial: "A", name: "Alex" },
  6:  { initial: "J", name: "Jordan" },
  9:  { initial: "S", name: "Sam" },
  10: { initial: "R", name: "Riley" },
  14: { initial: "C", name: "Casey" },
  16: { initial: "M", name: "Morgan" },
  21: { initial: "T", name: "Taylor" },
  22: { initial: "K", name: "Kai" },
  23: { initial: "L", name: "Lee" },
  27: { initial: "D", name: "Drew" },
  30: { initial: "N", name: "Noah" },
  33: { initial: "P", name: "Priya" },
  35: { initial: "E", name: "Ellis" },
  36: { initial: "Z", name: "Zane" },
  39: { initial: "B", name: "Blake" },
};

function PopBadge({
  progress,
  appearAt,
  initial,
  name,
}: {
  progress: MotionValue<number>;
  /** Scroll progress moment when the parent cell has finished fading in. */
  appearAt: number;
  initial: string;
  name: string;
}) {
  const popStart = appearAt + 0.004;
  const popEnd   = appearAt + 0.02;
  const op  = useTransform(progress, [popStart - 0.003, popStart, popEnd], [0, 0, 1]);
  const sc  = useTransform(progress, [popStart, popEnd], [0.55, 1]);
  const y   = useTransform(progress, [popStart, popEnd], [6, 0]);

  return (
    <motion.div
      style={{ opacity: op, scale: sc, y }}
      className="pointer-events-none absolute -top-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-md border border-white/15 bg-[#12122a]/95 px-1 py-0.5 text-[8px] font-semibold shadow-lg backdrop-blur-sm"
    >
      <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8b86f9] to-[#6d66f0] text-[7px] text-white">
        {initial}
      </span>
      <span className="max-w-[38px] truncate text-white/90">{name}</span>
    </motion.div>
  );
}

function ScrollingBookingCount({ progress }: { progress: MotionValue<number> }) {
  const [calStart, calEnd] = SCENE_RANGES[1];
  const mv = useTransform(progress, (v) => {
    if (v < calStart) return 0;
    if (v > calEnd) return 184;
    const t = (v - calStart) / (calEnd - calStart);
    return Math.min(184, Math.max(0, Math.round(t * 184)));
  });
  const [n, setN] = useState(0);
  useMotionValueEvent(mv, "change", setN);
  useEffect(() => {
    setN(mv.get());
  }, [mv]);
  return <span className="tabular-nums">{n}</span>;
}

function CalendarCell({
  index, progress,
}: {
  index: number;
  progress: MotionValue<number>;
}) {
  const [start, end] = SCENE_RANGES[1];
  const t0 = start + 0.02 + (index / CAL_TOTAL) * (end - start - 0.04);
  const t1 = t0 + 0.012;

  const op    = useTransform(progress, [start - 0.02, t0, t1], [0.15, 0.15, 1]);
  const scale = useTransform(progress, [t0 - 0.01, t1], [0.85, 1]);

  const isToday    = index === CAL_TODAY;
  const isSelected = index === CAL_PICK;
  const isBooked   = CAL_BOOKED.has(index);

  let bg = "bg-white/[0.04]";
  let txt = "text-rz-muted";
  let ring = "";
  if (isBooked && !isSelected) {
    bg  = "bg-gradient-to-br from-[#8b86f9]/35 to-[#6d66f0]/25";
    txt = "text-white";
  }
  if (isToday) {
    ring = "ring-1 ring-inset ring-[#38bdf8]/55";
    txt  = "text-white";
  }
  if (isSelected) {
    bg   = "bg-gradient-to-br from-[#8b86f9] to-[#6d66f0]";
    txt  = "text-white font-bold";
    ring = "shadow-[0_0_18px_rgba(139,134,249,0.6)]";
  }

  const meta = BOOKED_POP[index];

  return (
    <motion.div
      style={{ opacity: op, scale }}
      className={`relative flex aspect-square items-center justify-center rounded-md text-[11px] ${bg} ${ring} ${txt}`}
    >
      {meta && isBooked && !isSelected ? (
        <PopBadge progress={progress} appearAt={t1} initial={meta.initial} name={meta.name} />
      ) : null}
      {index + 1}
      {isBooked && !isSelected && (
        <span className="absolute bottom-0.5 right-0.5 h-1 w-1 rounded-full bg-[#b0abff]" />
      )}
    </motion.div>
  );
}

function CalendarFillScene({ progress }: { progress: MotionValue<number> }) {
  const opacity = useSceneOpacity(progress, 1);
  const scale   = useSceneScale(progress, 1);
  const cells   = Array.from({ length: CAL_TOTAL }, (_, i) => i);

  return (
    <motion.div
      style={{ opacity, scale }}
      className="absolute inset-0 flex flex-col gap-3 p-6 sm:p-8"
      aria-hidden
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-rz-accent">Step 2 of 4</p>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h3 className="text-lg font-bold text-white sm:text-xl">Pick a date</h3>
          <p className="text-xs text-rz-muted">March 2026</p>
        </div>
        <p className="text-[11px] text-rz-subtle">
          <ScrollingBookingCount progress={progress} />{" "}
          <span className="text-rz-muted">bookings this month · filling live as you scroll</span>
        </p>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="text-[10px] font-semibold uppercase tracking-wider text-rz-subtle">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((i) => (
          <CalendarCell key={i} index={i} progress={progress} />
        ))}
      </div>

      <div className="mt-1 flex items-center gap-3 text-[10px] text-rz-subtle">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-gradient-to-br from-[#8b86f9]/40 to-[#6d66f0]/30" />
          Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-gradient-to-br from-[#8b86f9] to-[#6d66f0]" />
          Selected
        </span>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Scene 3 — Time slot picker lighting up
 * ───────────────────────────────────────────────────────────────────── */
const SLOTS = [
  "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "16:00",
];
const SLOT_TAKEN = new Set([0, 3, 5, 8, 11]);
const SLOT_PICK  = 6;

function TimeSlotPill({
  index, label, progress,
}: {
  index: number;
  label: string;
  progress: MotionValue<number>;
}) {
  const [start] = SCENE_RANGES[2];
  const t0 = start + 0.02 + index * 0.012;
  const op = useTransform(progress, [start - 0.02, t0, t0 + 0.02], [0, 0, 1]);
  const y  = useTransform(progress, [start - 0.02, t0 + 0.02], [12, 0]);

  const taken  = SLOT_TAKEN.has(index);
  const picked = index === SLOT_PICK;

  let cls = "border-white/[0.08] bg-white/[0.04] text-white";
  if (taken)  cls = "border-white/[0.04] bg-white/[0.02] text-rz-subtle line-through";
  if (picked) cls = "border-[#8b86f9] bg-gradient-to-br from-[#8b86f9] to-[#6d66f0] text-white shadow-[0_0_20px_rgba(139,134,249,0.45)]";

  return (
    <motion.div
      style={{ opacity: op, y }}
      className={`flex items-center justify-center rounded-lg border py-2 text-xs font-semibold ${cls}`}
    >
      {label}
    </motion.div>
  );
}

function TimeSlotsScene({ progress }: { progress: MotionValue<number> }) {
  const opacity = useSceneOpacity(progress, 2);
  const scale   = useSceneScale(progress, 2);

  return (
    <motion.div
      style={{ opacity, scale }}
      className="absolute inset-0 flex flex-col gap-3 p-6 sm:p-8"
      aria-hidden
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-rz-accent">Step 3 of 4</p>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white sm:text-xl">Choose a time</h3>
        <p className="text-xs text-rz-muted">Tue 18 Mar</p>
      </div>

      <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {SLOTS.map((s, i) => (
          <TimeSlotPill key={s} index={i} label={s} progress={progress} />
        ))}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Scene 4 — Confirm / pay
 * ───────────────────────────────────────────────────────────────────── */
function ConfirmField({
  index, progress, children,
}: {
  index: number;
  progress: MotionValue<number>;
  children: React.ReactNode;
}) {
  const [start] = SCENE_RANGES[3];
  const op = useTransform(
    progress,
    [start - 0.02, start + 0.04 + index * 0.03, start + 0.06 + index * 0.03],
    [0, 0, 1],
  );
  const y = useTransform(progress, [start - 0.02, start + 0.06 + index * 0.03], [10, 0]);
  return <motion.div style={{ opacity: op, y }}>{children}</motion.div>;
}

function ConfirmScene({ progress }: { progress: MotionValue<number> }) {
  const opacity = useSceneOpacity(progress, 3);
  const scale   = useSceneScale(progress, 3);

  return (
    <motion.div
      style={{ opacity, scale }}
      className="absolute inset-0 flex flex-col gap-3 p-6 sm:p-8"
      aria-hidden
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-rz-accent">Step 4 of 4</p>
      <h3 className="text-lg font-bold text-white sm:text-xl">Confirm & pay</h3>

      <ConfirmField index={0} progress={progress}>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-xs">
          <div className="flex items-center justify-between text-rz-muted">
            <span>Cut & finish · Sarah</span>
            <span className="font-semibold text-white">£45.00</span>
          </div>
          <div className="mt-1 text-rz-subtle">Tue 18 Mar · 13:00 — 13:45</div>
        </div>
      </ConfirmField>

      <ConfirmField index={1} progress={progress}>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-rz-subtle">
          Name: <span className="text-white">Alex Morgan</span>
        </div>
      </ConfirmField>

      <ConfirmField index={2} progress={progress}>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-rz-subtle">
          Email: <span className="text-white">alex@example.com</span>
        </div>
      </ConfirmField>

      <ConfirmField index={3} progress={progress}>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-rz-subtle">
          Card: <span className="font-mono text-white">•••• 4242</span>
        </div>
      </ConfirmField>

      <ConfirmField index={4} progress={progress}>
        <div className="rounded-full bg-gradient-to-r from-[#8b86f9] to-[#6d66f0] py-2.5 text-center text-xs font-bold text-white shadow-[0_0_24px_rgba(139,134,249,0.45)]">
          Pay £15 deposit & confirm ✓
        </div>
      </ConfirmField>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Progress dots
 * ───────────────────────────────────────────────────────────────────── */
function ProgressDot({
  index, progress,
}: {
  index: number;
  progress: MotionValue<number>;
}) {
  const [start, end] = SCENE_RANGES[index];
  const width   = useTransform(progress, [start - 0.05, start, end, end + 0.05], [6, 24, 24, 6]);
  const opacity = useTransform(progress, [start - 0.05, start, end, end + 0.05], [0.3, 1, 1, 0.3]);
  return (
    <motion.div
      style={{ width, opacity }}
      className="h-1.5 rounded-full bg-[#8b86f9]"
    />
  );
}

function ProgressDots({ progress }: { progress: MotionValue<number> }) {
  return (
    <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 gap-1.5">
      {SCENES.map((_, i) => (
        <ProgressDot key={i} index={i} progress={progress} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Side cards (left/right rails) — each fades with its scene
 * ───────────────────────────────────────────────────────────────────── */
function SideStep({
  index, label, progress,
}: {
  index: number;
  label: string;
  progress: MotionValue<number>;
}) {
  const [start, end] = SCENE_RANGES[index];
  const opacity = useTransform(progress, [start - 0.06, start, end, end + 0.06], [0.25, 1, 1, 0.25]);
  const x       = useTransform(progress, [start - 0.06, start], [-12, 0]);
  return (
    <motion.div style={{ opacity, x }} className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#8b86f9]/15 text-xs font-bold text-rz-accent ring-1 ring-[#8b86f9]/30">
        {index + 1}
      </span>
      <span className="text-base font-semibold text-white">{label}</span>
    </motion.div>
  );
}

function SideFeature({
  index, title, body, progress,
}: {
  index: number;
  title: string;
  body: string;
  progress: MotionValue<number>;
}) {
  const [start, end] = SCENE_RANGES[index];
  const opacity = useTransform(progress, [start - 0.06, start, end, end + 0.06], [0.2, 1, 1, 0.2]);
  const x       = useTransform(progress, [start - 0.06, start], [12, 0]);
  return (
    <motion.div
      style={{ opacity, x }}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-sm"
    >
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="mt-0.5 text-xs text-rz-muted">{body}</p>
    </motion.div>
  );
}

const SIDE_FEATURES = [
  { title: "Branded service menu", body: "Your prices, your durations." },
  { title: "Live availability",    body: "No double bookings, ever." },
  { title: "Smart time slots",     body: "Respects buffers & staff hours." },
  { title: "Stripe payments",      body: "Deposits collected on the spot." },
];

/* ─────────────────────────────────────────────────────────────────────
 * Mobile-lite fallback
 * ───────────────────────────────────────────────────────────────────── */
function MobileStack() {
  return (
    <div className="space-y-5">
      {SCENES.map((label, i) => (
        <div key={label} className="rz-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-rz-accent">
            Step {i + 1} of 4
          </p>
          <h3 className="mt-1 text-base font-bold text-white">{label}</h3>
          <p className="mt-2 text-sm text-rz-muted">
            {i === 0 && "Customers pick from your services with prices and durations."}
            {i === 1 && "Live calendar shows real availability — booked slots fade in as confirmed."}
            {i === 2 && "Free time slots light up. Taken ones are clearly marked."}
            {i === 3 && "Take a deposit upfront via Stripe. Booking confirmed instantly."}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Main export
 * ───────────────────────────────────────────────────────────────────── */
export function PinnedBookingDemo() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  /* Frame floats in/out at the ends of the pin range. */
  const frameY = useTransform(scrollYProgress, [0, 0.05, 0.95, 1], [40, 0, 0, -20]);

  if (reduceMotion) {
    return (
      <section className="border-y border-white/[0.05] py-16">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <p className="rz-badge mb-4 inline-flex">See it in action</p>
          <h2 className="mb-6 text-2xl font-extrabold text-white">
            How customers book on your page
          </h2>
          <MobileStack />
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="relative border-y border-white/[0.05]"
      style={{ height: `${PIN_SECTION_VH}vh` }}
      aria-label="See the customer booking experience"
    >
      {/* Mobile fallback — visible below sm */}
      <div className="px-5 py-16 sm:hidden">
        <div className="mx-auto max-w-md">
          <p className="rz-badge mb-4 inline-flex">See it in action</p>
          <h2 className="mb-6 text-2xl font-extrabold text-white">
            How customers book on your page
          </h2>
          <MobileStack />
        </div>
      </div>

      {/* Pinned desktop centrepiece */}
      <div className="sticky top-0 hidden h-screen items-center justify-center overflow-hidden sm:flex">
        <motion.div
          style={{
            background:
              "radial-gradient(60% 60% at 50% 45%, rgba(139,134,249,0.18), transparent 70%)",
          }}
          className="pointer-events-none absolute inset-0"
          aria-hidden
        />

        <div className="relative z-10 grid w-full max-w-6xl gap-10 px-8 lg:grid-cols-[1fr_minmax(0,420px)_1fr] lg:items-center">
          {/* Left rail */}
          <div className="hidden flex-col gap-4 self-center lg:flex">
            <p className="rz-badge inline-flex w-fit">See it in action</p>
            <h2 className="text-3xl font-extrabold leading-tight text-white">
              How customers <br />
              <span className="bg-gradient-to-r from-[#b0abff] via-[#8b86f9] to-[#7c6df8] bg-clip-text text-transparent">
                book on your page
              </span>
            </h2>
            {SCENES.map((label, i) => (
              <SideStep key={label} index={i} label={label} progress={scrollYProgress} />
            ))}
          </div>

          {/* Device frame */}
          <motion.div
            style={{ y: frameY }}
            className="relative mx-auto w-full max-w-[420px]"
          >
            <div className="relative rounded-[2rem] border border-white/[0.12] bg-gradient-to-b from-[#1a1a3e] to-[#0b0b22] p-2 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
              <div className="absolute left-1/2 top-2 z-20 h-1.5 w-20 -translate-x-1/2 rounded-full bg-black/60" />

              <div className="relative aspect-[9/16] overflow-hidden rounded-[1.55rem] border border-white/[0.06] bg-[#0a0a1e]">
                <ProgressDots progress={scrollYProgress} />

                <div className="absolute left-1/2 top-9 z-10 -translate-x-1/2 rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1 font-mono text-[10px] text-rz-subtle">
                  sarah.reservezy.com
                </div>

                <div className="absolute inset-0 pt-16">
                  <ServiceCardsScene progress={scrollYProgress} />
                  <CalendarFillScene progress={scrollYProgress} />
                  <TimeSlotsScene    progress={scrollYProgress} />
                  <ConfirmScene      progress={scrollYProgress} />
                </div>
              </div>
            </div>

            <div
              className="pointer-events-none absolute -bottom-10 left-1/2 h-10 w-3/4 -translate-x-1/2 rounded-[50%] bg-black/50 blur-2xl"
              aria-hidden
            />
          </motion.div>

          {/* Right rail */}
          <div className="hidden flex-col gap-3 self-center lg:flex">
            {SIDE_FEATURES.map((f, i) => (
              <SideFeature
                key={f.title}
                index={i}
                title={f.title}
                body={f.body}
                progress={scrollYProgress}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
