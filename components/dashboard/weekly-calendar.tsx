"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_START = 7;
const HOUR_END = 21;
const TOTAL_HOURS = HOUR_END - HOUR_START;

type BookingEntry = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  notes: string;
  service: { name: string; durationMinutes: number };
  customer: { fullName: string; email: string; phone: string };
  staffMember: { fullName: string } | null;
};

const STATUS_COLOURS: Record<string, string> = {
  CONFIRMED: "border-[#8b86f9]/50 bg-[#8b86f9]/20 text-[#c4b5fd]",
  COMPLETED: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  CANCELLED: "border-red-500/30 bg-red-500/10 text-red-300 opacity-60",
  NO_SHOW: "border-amber-500/30 bg-amber-500/10 text-amber-300 opacity-70",
};

function pct(date: Date) {
  const hour = date.getHours() + date.getMinutes() / 60;
  return Math.max(0, Math.min(100, ((hour - HOUR_START) / TOTAL_HOURS) * 100));
}

function height(start: Date, end: Date) {
  const mins = (end.getTime() - start.getTime()) / 60000;
  return Math.max(2, (mins / (TOTAL_HOURS * 60)) * 100);
}

export default function WeeklyCalendar({ timezone }: { timezone: string }) {
  const [offset, setOffset] = useState(0);
  const [bookings, setBookings] = useState<BookingEntry[]>([]);
  const [weekStart, setWeekStart] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BookingEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/calendar?offset=${offset}`);
      const data = await res.json();
      setBookings(data.bookings);
      setWeekStart(new Date(data.weekStart));
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => { load(); }, [load]);

  const days = weekStart
    ? Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      })
    : [];

  function bookingsForDay(day: Date) {
    return bookings.filter((b) => {
      const d = new Date(b.startsAt);
      return d.toDateString() === day.toDateString();
    });
  }

  const weekLabel = weekStart
    ? weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "Loading…";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Calendar</h1>
          <p className="text-sm text-rz-muted">Week of {weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOffset((o) => o - 1)}
            className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-rz-muted transition hover:border-white/20 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setOffset(0)}
            className="rz-btn-ghost text-xs"
            disabled={offset === 0}
          >
            Today
          </button>
          <button
            onClick={() => setOffset((o) => o + 1)}
            className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-rz-muted transition hover:border-white/20 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0d0d22]/90 backdrop-blur-sm">
        {/* Day headers */}
        <div className="grid border-b border-white/[0.08]" style={{ gridTemplateColumns: "3rem repeat(7, 1fr)" }}>
          <div className="border-r border-white/[0.06]" />
          {days.map((day, i) => {
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div
                key={i}
                className={`border-r border-white/[0.06] py-3 text-center last:border-0 ${isToday ? "bg-[#8b86f9]/10" : ""}`}
              >
                <span className={`block text-xs font-semibold uppercase tracking-widest ${isToday ? "text-[#a5a0ff]" : "text-rz-subtle"}`}>
                  {DAY_LABELS[i]}
                </span>
                <span className={`mt-0.5 block text-lg font-bold ${isToday ? "text-white" : "text-rz-muted"}`}>
                  {day.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Hour rows */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[#8b86f9]" />
          </div>
        ) : (
          <div className="relative" style={{ height: `${TOTAL_HOURS * 56}px` }}>
            {/* Hour lines */}
            {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-t border-white/[0.05]"
                style={{ top: `${(i / TOTAL_HOURS) * 100}%` }}
              >
                <span className="absolute left-1 top-0.5 text-[10px] text-rz-subtle">
                  {String(HOUR_START + i).padStart(2, "0")}:00
                </span>
              </div>
            ))}

            {/* Day columns */}
            <div
              className="absolute inset-0 grid"
              style={{ gridTemplateColumns: "3rem repeat(7, 1fr)" }}
            >
              <div className="border-r border-white/[0.06]" />
              {days.map((day, di) => {
                const dayBookings = bookingsForDay(day);
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={di}
                    className={`relative border-r border-white/[0.06] last:border-0 ${isToday ? "bg-[#8b86f9]/[0.04]" : ""}`}
                  >
                    {dayBookings.map((b) => {
                      const start = new Date(b.startsAt);
                      const end = new Date(b.endsAt);
                      const top = pct(start);
                      const h = height(start, end);
                      const colour = STATUS_COLOURS[b.status] ?? STATUS_COLOURS.CONFIRMED;
                      return (
                        <button
                          key={b.id}
                          onClick={() => setSelected(b)}
                          className={`absolute inset-x-0.5 overflow-hidden rounded-lg border px-1.5 py-1 text-left transition hover:brightness-110 ${colour}`}
                          style={{ top: `${top}%`, height: `${h}%`, minHeight: "24px" }}
                        >
                          <p className="truncate text-[10px] font-semibold leading-tight">{b.service.name}</p>
                          <p className="truncate text-[9px] leading-tight opacity-80">{b.customer.fullName}</p>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* No bookings message */}
            {bookings.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-50">
                <CalendarDays className="h-8 w-8 text-rz-subtle" />
                <p className="text-sm text-rz-muted">No bookings this week</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Booking detail drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#13132c] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className={`mb-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOURS[selected.status]}`}>
                  {selected.status}
                </div>
                <h3 className="text-lg font-semibold text-white">{selected.service.name}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="text-rz-muted hover:text-white">✕</button>
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-rz-muted">Customer</dt>
                <dd className="text-white">{selected.customer.fullName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-rz-muted">Email</dt>
                <dd className="text-white">{selected.customer.email}</dd>
              </div>
              {selected.customer.phone && (
                <div className="flex justify-between">
                  <dt className="text-rz-muted">Phone</dt>
                  <dd className="text-white">{selected.customer.phone}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-rz-muted">Time</dt>
                <dd className="text-white">
                  {new Date(selected.startsAt).toLocaleTimeString("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit" })}
                  {" – "}
                  {new Date(selected.endsAt).toLocaleTimeString("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit" })}
                </dd>
              </div>
              {selected.staffMember && (
                <div className="flex justify-between">
                  <dt className="text-rz-muted">Staff</dt>
                  <dd className="text-white">{selected.staffMember.fullName}</dd>
                </div>
              )}
              {selected.notes && (
                <div>
                  <dt className="mb-1 text-rz-muted">Notes</dt>
                  <dd className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-white">{selected.notes}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
