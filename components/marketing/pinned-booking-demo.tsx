"use client";

import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Pinned scroll-scrubbed booking-flow — homepage centrepiece.
 *
 * Five scenes (hybrid narrative as discussed):
 *   1. Pick a service
 *   2. Calendar month — days fill in with live booking pops
 *   3. Live availability grid — slot cells fill like the real booking UI
 *   4. Choose a time
 *   5. Confirm & pay
 */

const SCENES = [
  "Pick a service",
  "Pick a date",
  "Live availability",
  "Choose a time",
  "Confirm & pay",
];

/** Wider middle scenes so calendar + availability grid both get runway. */
const SCENE_RANGES: Array<[number, number]> = [
  [0.00, 0.10],
  [0.12, 0.32],
  [0.34, 0.52],
  [0.54, 0.72],
  [0.74, 0.96],
];

const PIN_SECTION_VH = 620;

function useSceneOpacity(progress: MotionValue<number>, index: number) {
  const [start, end] = SCENE_RANGES[index];
  return useTransform(progress, [start - 0.035, start, end, end + 0.035], [0, 1, 1, 0]);
}

function useSceneScale(progress: MotionValue<number>, index: number) {
  const [start, end] = SCENE_RANGES[index];
  const mid = (start + end) / 2;
  return useTransform(progress, [start - 0.035, mid, end + 0.035], [0.94, 1, 0.94]);
}

/* ═══ Scroll-linked backdrop (inside sticky) ═══ */
function PinnedAtmosphere({ progress }: { progress: MotionValue<number> }) {
  const y1 = useTransform(progress, [0, 1], [0, -180]);
  const y2 = useTransform(progress, [0, 1], [0, 120]);
  const rot = useTransform(progress, [0, 1], [0, 18]);
  const meshOp = useTransform(progress, [0.1, 0.45, 0.85], [0.35, 0.75, 0.4]);

  return (
    <>
      <motion.div
        style={{ y: y1, opacity: meshOp }}
        className="pointer-events-none absolute -left-1/4 top-0 h-[140%] w-[70%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(139,134,249,0.28)_0%,transparent_65%)] blur-3xl"
        aria-hidden
      />
      <motion.div
        style={{ y: y2 }}
        className="pointer-events-none absolute -right-1/4 bottom-0 h-[120%] w-[60%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(109,102,240,0.22)_0%,transparent_60%)] blur-3xl"
        aria-hidden
      />
      <motion.div
        style={{ rotate: rot, opacity: 0.12 }}
        className="pointer-events-none absolute left-1/2 top-1/2 h-[200vmin] w-[200vmin] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_180deg_at_50%_50%,#8b86f9,transparent_40%,#38bdf8,transparent_70%,#6d66f0)] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_45%,transparent_0%,rgba(9,9,26,0.85)_100%)]"
        aria-hidden
      />
    </>
  );
}

/* ═══ Scene 1 — Services ═══ */
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
    [start - 0.02, start + 0.03 + index * 0.04, start + 0.05 + index * 0.04],
    [0, 0, 1],
  );
  const y = useTransform(progress, [start - 0.02, start + 0.06 + index * 0.04], [20, 0]);

  return (
    <motion.div
      style={{ opacity: op, y }}
      className={`relative flex items-center gap-3 overflow-hidden rounded-xl border p-3 ${
        selected
          ? "border-[#8b86f9]/60 bg-[#8b86f9]/12 shadow-[0_0_32px_rgba(139,134,249,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]"
          : "border-white/[0.08] bg-white/[0.03]"
      }`}
    >
      {selected ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)",
            backgroundSize: "200% 100%",
            animation: "rz-pin-shimmer 2.2s ease-in-out infinite",
          }}
        />
      ) : null}
      <span className="relative z-[1] flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.08] text-base ring-1 ring-white/10">
        {service.emoji}
      </span>
      <div className="relative z-[1] min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{service.name}</p>
        <p className="text-xs text-rz-subtle">{service.dur}</p>
      </div>
      <span className="relative z-[1] text-sm font-bold text-white">{service.price}</span>
      {selected ? (
        <span className="relative z-[1] ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#8b86f9] to-[#6d66f0] text-[11px] font-bold text-white shadow-lg shadow-[#8b86f9]/40">
          ✓
        </span>
      ) : null}
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
      <p className="text-xs font-semibold uppercase tracking-widest text-rz-accent">Step 1 of 5</p>
      <h3 className="text-lg font-bold text-white sm:text-xl">Choose a service</h3>
      <div className="mt-2 grid gap-2.5">
        {SERVICES.map((s, i) => (
          <ServiceCard key={s.name} service={s} index={i} progress={progress} selected={i === 0} />
        ))}
      </div>
    </motion.div>
  );
}

/* ═══ Scene 2 — Calendar ═══ */
const CAL_TOTAL  = 42;
const CAL_TODAY  = 8;
const CAL_PICK   = 17;
const CAL_BOOKED = new Set([3, 6, 9, 10, 14, 16, 21, 22, 23, 27, 30, 33, 35, 36, 39]);

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
  progress, appearAt, initial, name,
}: {
  progress: MotionValue<number>;
  appearAt: number;
  initial: string;
  name: string;
}) {
  const popStart = appearAt + 0.003;
  const popEnd   = appearAt + 0.018;
  const op  = useTransform(progress, [popStart - 0.002, popStart, popEnd], [0, 0, 1]);
  const sc  = useTransform(progress, [popStart, popEnd], [0.5, 1]);
  const y   = useTransform(progress, [popStart, popEnd], [8, 0]);

  return (
    <motion.div
      style={{ opacity: op, scale: sc, y }}
      className="pointer-events-none absolute -top-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-md border border-white/20 bg-[#0c0c22]/95 px-1.5 py-0.5 text-[8px] font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-md"
    >
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8b86f9] to-[#6d66f0] text-[7px] text-white shadow-inner">
        {initial}
      </span>
      <span className="max-w-[40px] truncate text-white/95">{name}</span>
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
  return <span className="tabular-nums font-semibold text-[#c4b5fd]">{n}</span>;
}

function CalendarCell({ index, progress }: { index: number; progress: MotionValue<number> }) {
  const [start, end] = SCENE_RANGES[1];
  const t0 = start + 0.015 + (index / CAL_TOTAL) * (end - start - 0.05);
  const t1 = t0 + 0.011;

  const op    = useTransform(progress, [start - 0.02, t0, t1], [0.12, 0.12, 1]);
  const scale = useTransform(progress, [t0 - 0.008, t1], [0.82, 1]);

  const isToday    = index === CAL_TODAY;
  const isSelected = index === CAL_PICK;
  const isBooked   = CAL_BOOKED.has(index);

  let bg = "bg-white/[0.05]";
  let txt = "text-rz-muted";
  let ring = "";
  if (isBooked && !isSelected) {
    bg  = "bg-gradient-to-br from-[#8b86f9]/45 to-[#6d66f0]/30";
    txt = "text-white";
    ring = "shadow-[inset_0_0_12px_rgba(139,134,249,0.25)]";
  }
  if (isToday) {
    ring = `${ring} ring-1 ring-inset ring-[#38bdf8]/60`;
    txt  = "text-white";
  }
  if (isSelected) {
    bg   = "bg-gradient-to-br from-[#8b86f9] to-[#6d66f0]";
    txt  = "text-white font-bold";
    ring = "shadow-[0_0_22px_rgba(139,134,249,0.75),inset_0_1px_0_rgba(255,255,255,0.2)]";
  }

  const meta = BOOKED_POP[index];
  const selectedPulse = useTransform(
    progress,
    [end - 0.04, end - 0.02, end],
    isSelected ? [1, 1.06, 1] : [1, 1, 1],
  );

  return (
    <motion.div
      style={{ opacity: op, scale: isSelected ? selectedPulse : scale }}
      className={`relative flex aspect-square items-center justify-center rounded-md text-[11px] ${bg} ${ring} ${txt}`}
    >
      {meta && isBooked && !isSelected ? (
        <PopBadge progress={progress} appearAt={t1} initial={meta.initial} name={meta.name} />
      ) : null}
      {index + 1}
      {isBooked && !isSelected ? (
        <span className="absolute bottom-0.5 right-0.5 h-1 w-1 rounded-full bg-[#e0ddff] shadow-[0_0_6px_#b0abff]" />
      ) : null}
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
      className="absolute inset-0 flex flex-col gap-2.5 p-6 sm:p-8"
      aria-hidden
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-rz-accent">Step 2 of 5</p>
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h3 className="text-lg font-bold text-white sm:text-xl">Pick a date</h3>
          <p className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium text-rz-muted">
            March 2026
          </p>
        </div>
        <p className="text-[11px] leading-snug text-rz-subtle">
          <ScrollingBookingCount progress={progress} />{" "}
          <span className="text-rz-muted">bookings this month · syncing as you scroll</span>
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

      <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-2 text-[10px] text-rz-subtle">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-gradient-to-br from-[#8b86f9]/50 to-[#6d66f0]/35 shadow-[0_0_8px_rgba(139,134,249,0.5)]" />
          Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-gradient-to-br from-[#8b86f9] to-[#6d66f0]" />
          Your pick
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm ring-1 ring-[#38bdf8]/60 bg-white/[0.06]" />
          Today
        </span>
      </div>
    </motion.div>
  );
}

/* ═══ Scene 3 — Live availability grid (day view) ═══ */
const SLOT_GRID = 24;
/** Indices that become “booked” as the user scrolls — wave across the day. */
const SLOT_BOOKED = new Set([1, 2, 4, 5, 7, 9, 11, 12, 14, 15, 17, 19, 20, 22]);

function AvailabilitySlot({ index, progress }: { index: number; progress: MotionValue<number> }) {
  const [start, end] = SCENE_RANGES[2];
  const t0 = start + 0.02 + (index / SLOT_GRID) * (end - start - 0.06);
  const t1 = t0 + 0.012;

  const op    = useTransform(progress, [start - 0.02, t0, t1], [0.08, 0.08, 1]);
  const scale = useTransform(progress, [t0 - 0.01, t1], [0.75, 1]);

  const booked = SLOT_BOOKED.has(index);
  const open   = !booked;

  return (
    <motion.div
      style={{ opacity: op, scale }}
      className={`aspect-square rounded-md border transition-colors ${
        booked
          ? "border-[#8b86f9]/40 bg-gradient-to-br from-[#8b86f9]/40 to-[#6d66f0]/25 shadow-[0_0_14px_rgba(139,134,249,0.35)]"
          : "border-emerald-500/25 bg-emerald-500/[0.08] shadow-[inset_0_0_0_1px_rgba(52,211,153,0.15)]"
      }`}
    >
      {open ? (
        <div className="flex h-full w-full items-center justify-center">
          <span className="text-[8px] font-bold uppercase tracking-tighter text-emerald-300/90">open</span>
        </div>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-0.5">
          <span className="h-1 w-1 rounded-full bg-white/90 shadow-[0_0_6px_white]" />
          <span className="text-[7px] font-semibold uppercase text-white/80">booked</span>
        </div>
      )}
    </motion.div>
  );
}

function AvailabilityGridScene({ progress }: { progress: MotionValue<number> }) {
  const opacity = useSceneOpacity(progress, 2);
  const scale   = useSceneScale(progress, 2);
  const slots   = Array.from({ length: SLOT_GRID }, (_, i) => i);

  const fillCount = useTransform(progress, (v) => {
    const [a, b] = SCENE_RANGES[2];
    if (v < a + 0.05) return 0;
    if (v > b - 0.02) return SLOT_BOOKED.size;
    const u = (v - (a + 0.05)) / (b - a - 0.07);
    return Math.min(SLOT_BOOKED.size, Math.max(0, Math.round(u * SLOT_BOOKED.size)));
  });
  const [filled, setFilled] = useState(0);
  useMotionValueEvent(fillCount, "change", setFilled);
  useEffect(() => {
    setFilled(fillCount.get());
  }, [fillCount]);

  return (
    <motion.div
      style={{ opacity, scale }}
      className="absolute inset-0 flex flex-col gap-2.5 p-6 sm:p-8"
      aria-hidden
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-rz-accent">Step 3 of 5</p>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-white sm:text-xl">Live availability</h3>
          <p className="mt-0.5 text-[11px] text-rz-muted">Tue 18 Mar · slots fill as customers book</p>
        </div>
        <div className="shrink-0 rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-right">
          <p className="text-[9px] uppercase tracking-wider text-rz-subtle">Booked</p>
          <p className="text-sm font-bold tabular-nums text-[#c4b5fd]">{filled}</p>
        </div>
      </div>

      <p className="text-[10px] text-rz-subtle">
        Each square is a bookable window — purple = taken, green = open for you.
      </p>

      <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
        {slots.map((i) => (
          <AvailabilitySlot key={i} index={i} progress={progress} />
        ))}
      </div>
    </motion.div>
  );
}

/* ═══ Scene 4 — Time slots ═══ */
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
  const [start] = SCENE_RANGES[3];
  const t0 = start + 0.02 + index * 0.011;
  const op = useTransform(progress, [start - 0.02, t0, t0 + 0.018], [0, 0, 1]);
  const y  = useTransform(progress, [start - 0.02, t0 + 0.02], [14, 0]);

  const taken  = SLOT_TAKEN.has(index);
  const picked = index === SLOT_PICK;
  const pulse  = useTransform(
    progress,
    [start + 0.35, start + 0.42, start + 0.5],
    picked ? [1, 1.04, 1] : [1, 1, 1],
  );

  let cls = "border-white/[0.1] bg-white/[0.05] text-white";
  if (taken)  cls = "border-white/[0.05] bg-white/[0.02] text-rz-subtle line-through";
  if (picked) cls = "border-[#8b86f9] bg-gradient-to-br from-[#8b86f9] to-[#6d66f0] text-white shadow-[0_0_28px_rgba(139,134,249,0.55)]";

  return (
    <motion.div
      style={{ opacity: op, y, scale: picked ? pulse : 1 }}
      className={`flex items-center justify-center rounded-lg border py-2 text-xs font-semibold ${cls}`}
    >
      {label}
    </motion.div>
  );
}

function TimeSlotsScene({ progress }: { progress: MotionValue<number> }) {
  const opacity = useSceneOpacity(progress, 3);
  const scale   = useSceneScale(progress, 3);

  return (
    <motion.div
      style={{ opacity, scale }}
      className="absolute inset-0 flex flex-col gap-3 p-6 sm:p-8"
      aria-hidden
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-rz-accent">Step 4 of 5</p>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white sm:text-xl">Choose a time</h3>
        <p className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] text-rz-muted">
          Tue 18 Mar
        </p>
      </div>

      <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {SLOTS.map((s, i) => (
          <TimeSlotPill key={s} index={i} label={s} progress={progress} />
        ))}
      </div>
    </motion.div>
  );
}

/* ═══ Scene 5 — Confirm ═══ */
function ConfirmField({
  index, progress, children,
}: {
  index: number;
  progress: MotionValue<number>;
  children: React.ReactNode;
}) {
  const [start] = SCENE_RANGES[4];
  const op = useTransform(
    progress,
    [start - 0.02, start + 0.035 + index * 0.028, start + 0.055 + index * 0.028],
    [0, 0, 1],
  );
  const y = useTransform(progress, [start - 0.02, start + 0.055 + index * 0.028], [12, 0]);
  return <motion.div style={{ opacity: op, y }}>{children}</motion.div>;
}

function ConfirmScene({ progress }: { progress: MotionValue<number> }) {
  const opacity = useSceneOpacity(progress, 4);
  const scale   = useSceneScale(progress, 4);

  return (
    <motion.div
      style={{ opacity, scale }}
      className="absolute inset-0 flex flex-col gap-3 p-6 sm:p-8"
      aria-hidden
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-rz-accent">Step 5 of 5</p>
      <h3 className="text-lg font-bold text-white sm:text-xl">Confirm & pay</h3>

      <ConfirmField index={0} progress={progress}>
        <div className="rounded-xl border border-white/[0.1] bg-white/[0.04] p-3 text-xs shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
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
        <div className="rounded-full bg-gradient-to-r from-[#8b86f9] to-[#6d66f0] py-2.5 text-center text-xs font-bold text-white shadow-[0_0_32px_rgba(139,134,249,0.55)]">
          Pay £15 deposit & confirm ✓
        </div>
      </ConfirmField>
    </motion.div>
  );
}

/* ═══ Progress dots ═══ */
function ProgressDot({ index, progress }: { index: number; progress: MotionValue<number> }) {
  const [start, end] = SCENE_RANGES[index];
  const width   = useTransform(progress, [start - 0.04, start, end, end + 0.04], [5, 20, 20, 5]);
  const opacity = useTransform(progress, [start - 0.04, start, end, end + 0.04], [0.25, 1, 1, 0.25]);
  return (
    <motion.div
      style={{ width, opacity }}
      className="h-1.5 rounded-full bg-gradient-to-r from-[#b0abff] to-[#8b86f9] shadow-[0_0_12px_rgba(139,134,249,0.45)]"
    />
  );
}

function ProgressDots({ progress }: { progress: MotionValue<number> }) {
  return (
    <div className="absolute left-1/2 top-3 z-30 flex max-w-[min(90%,280px)] -translate-x-1/2 gap-1 sm:gap-1.5">
      {SCENES.map((_, i) => (
        <ProgressDot key={i} index={i} progress={progress} />
      ))}
    </div>
  );
}

/* ═══ Side rails ═══ */
function SideStep({ index, label, progress }: { index: number; label: string; progress: MotionValue<number> }) {
  const [start, end] = SCENE_RANGES[index];
  const opacity = useTransform(progress, [start - 0.055, start, end, end + 0.055], [0.2, 1, 1, 0.2]);
  const x       = useTransform(progress, [start - 0.055, start], [-14, 0]);
  return (
    <motion.div style={{ opacity, x }} className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8b86f9]/25 to-[#6d66f0]/10 text-xs font-bold text-rz-accent ring-1 ring-[#8b86f9]/35 shadow-[0_0_16px_rgba(139,134,249,0.2)]">
        {index + 1}
      </span>
      <span className="text-[0.95rem] font-semibold leading-snug text-white">{label}</span>
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
  const opacity = useTransform(progress, [start - 0.055, start, end, end + 0.055], [0.15, 1, 1, 0.15]);
  const x       = useTransform(progress, [start - 0.055, start], [16, 0]);
  return (
    <motion.div
      style={{ opacity, x }}
      className="rounded-2xl border border-white/[0.1] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur-md"
    >
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-rz-muted">{body}</p>
    </motion.div>
  );
}

const SIDE_FEATURES = [
  { title: "Branded menu",       body: "Services, prices, and durations — yours." },
  { title: "Month at a glance",  body: "Booked days glow; your pick locks in instantly." },
  { title: "Slot-level live view", body: "Every window updates — no stale availability." },
  { title: "Smart times",        body: "Buffers, staff hours, and holidays respected." },
  { title: "Stripe checkout",    body: "Deposits land before the slot is yours." },
];

/* ═══ Main ═══ */
export function PinnedBookingDemo() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const frameY    = useTransform(scrollYProgress, [0, 0.06, 0.94, 1], [48, 0, 0, -28]);
  const frameRotX = useTransform(scrollYProgress, [0, 0.5, 1], [4, 0, -2]);
  const shellShadow = useTransform(
    scrollYProgress,
    [0, 0.45, 1],
    [
      "0 40px 100px rgba(0,0,0,0.55), 0 0 48px rgba(139,134,249,0.18)",
      "0 48px 120px rgba(0,0,0,0.6), 0 0 96px rgba(139,134,249,0.42)",
      "0 40px 100px rgba(0,0,0,0.55), 0 0 56px rgba(139,134,249,0.22)",
    ],
  );

  return (
    <section
      ref={sectionRef}
      className="relative border-y border-white/[0.05]"
      style={{ height: `${PIN_SECTION_VH}vh` }}
      aria-label="See the customer booking experience"
    >
      {/* Same scroll-scrubbed device frame on all viewports — side rails only from lg up */}
      <div className="sticky top-0 flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden py-6 sm:py-0">
        <PinnedAtmosphere progress={scrollYProgress} />

        <div className="relative z-10 mb-4 w-full max-w-md px-4 text-center lg:hidden">
          <p className="rz-badge mb-2 inline-flex">Scroll the story</p>
          <h2 className="text-xl font-extrabold leading-snug text-white sm:text-2xl">
            Watch the{" "}
            <span className="bg-gradient-to-r from-[#b0abff] via-[#8b86f9] to-[#7c6df8] bg-clip-text text-transparent">
              booking flow
            </span>{" "}
            in the frame
          </h2>
          <p className="mt-2 text-xs text-rz-muted sm:text-sm">
            Keep scrolling — the phone scrubs through service → calendar → live slots → time → pay.
          </p>
        </div>

        <div className="relative z-10 grid w-full max-w-6xl flex-1 items-center gap-6 px-4 sm:gap-8 sm:px-6 lg:grid-cols-[1fr_minmax(0,400px)_1fr] lg:gap-10 xl:max-w-7xl">
          <div className="hidden flex-col gap-3 self-center lg:flex">
            <p className="rz-badge inline-flex w-fit">Scroll the story</p>
            <h2 className="text-3xl font-extrabold leading-[1.15] text-white xl:text-4xl">
              How customers{" "}
              <span className="bg-gradient-to-r from-[#b0abff] via-[#8b86f9] to-[#7c6df8] bg-clip-text text-transparent">
                book on your page
              </span>
            </h2>
            <p className="text-sm text-rz-muted">
              One continuous flow — service, calendar, live slots, time, then pay.
            </p>
            {SCENES.map((label, i) => (
              <SideStep key={label} index={i} label={label} progress={scrollYProgress} />
            ))}
          </div>

          <motion.div
            style={{ y: frameY, perspective: 1400 }}
            className="relative mx-auto w-full max-w-[min(100%,300px)] sm:max-w-[340px] lg:max-w-[400px]"
          >
            <motion.div
              style={{ rotateX: frameRotX, boxShadow: shellShadow, transformStyle: "preserve-3d" }}
              className="relative rounded-[2rem] border border-white/[0.14] bg-gradient-to-b from-[#1e1e45] via-[#12122a] to-[#080816] p-[10px] will-change-transform"
            >
              <div className="absolute left-1/2 top-2.5 z-30 h-1.5 w-[4.5rem] -translate-x-1/2 rounded-full bg-black/70 ring-1 ring-white/10" />

              <div className="relative aspect-[9/16] overflow-hidden rounded-[1.45rem] border border-[#8b86f9]/20 bg-[#070714] shadow-[inset_0_0_60px_rgba(0,0,0,0.65)]">
                <div
                  className="pointer-events-none absolute inset-0 rounded-[1.45rem] ring-1 ring-inset ring-white/[0.06]"
                  aria-hidden
                />
                <ProgressDots progress={scrollYProgress} />

                <div className="absolute left-1/2 top-9 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/40 px-3 py-1 font-mono text-[10px] text-rz-accent shadow-[0_0_20px_rgba(139,134,249,0.2)] backdrop-blur-md">
                  sarah.reservezy.com
                </div>

                <div className="absolute inset-0 pt-16">
                  <ServiceCardsScene     progress={scrollYProgress} />
                  <CalendarFillScene     progress={scrollYProgress} />
                  <AvailabilityGridScene progress={scrollYProgress} />
                  <TimeSlotsScene        progress={scrollYProgress} />
                  <ConfirmScene          progress={scrollYProgress} />
                </div>
              </div>
            </motion.div>

            <div
              className="pointer-events-none absolute -bottom-12 left-1/2 h-12 w-[85%] -translate-x-1/2 rounded-[50%] bg-black/60 blur-2xl"
              aria-hidden
            />
          </motion.div>

          <div className="hidden flex-col gap-2.5 self-center lg:flex">
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
