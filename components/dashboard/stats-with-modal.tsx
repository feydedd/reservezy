"use client";

import { useState, useEffect, useCallback } from "react";
import { X, TrendingUp, Calendar, Clock, ChevronRight, Loader2 } from "lucide-react";

type Period = "today" | "week" | "month" | "upcoming";

type BookingSummary = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  pricePenceSnapshot: number;
  notes: string;
  service:     { name: string } | null;
  customer:    { fullName: string; email: string; phone: string | null } | null;
  staffMember: { fullName: string } | null;
};

type StatConfig = {
  key: Period | "revenue";
  label: string;
  value: string;
  clickable: boolean;
};

function formatMoney(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  });
}

const PERIOD_LABELS: Record<Period, string> = {
  today:    "Today's bookings",
  week:     "This week's bookings",
  month:    "This month's bookings",
  upcoming: "Upcoming bookings",
};

/* ── Status badge ── */
function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, string> = {
    CONFIRMED:  "bg-green-500/15 text-green-400 border-green-500/25",
    COMPLETED:  "bg-blue-500/15 text-blue-400 border-blue-500/25",
    CANCELLED:  "bg-red-500/15 text-red-400 border-red-500/25",
    NO_SHOW:    "bg-orange-500/15 text-orange-400 border-orange-500/25",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colours[status] ?? "bg-white/10 text-rz-muted"}`}>
      {status.charAt(0) + status.slice(1).toLowerCase().replace("_", " ")}
    </span>
  );
}

/* ── Period analytics modal ── */
function PeriodModal({
  period,
  onClose,
}: {
  period: Period;
  onClose: () => void;
}) {
  const [bookings, setBookings]           = useState<BookingSummary[]>([]);
  const [totalRevenue, setTotalRevenue]   = useState(0);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`/api/dashboard/period-bookings?period=${period}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setBookings(data.bookings ?? []);
      setTotalRevenue(data.totalRevenuePence ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  /* Close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={PERIOD_LABELS[period]}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0f0f28] shadow-[0_32px_80px_rgba(0,0,0,0.7)]">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.07] px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-white">{PERIOD_LABELS[period]}</h2>
            {!loading && !error && (
              <p className="mt-0.5 text-sm text-rz-muted">
                {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
                {totalRevenue > 0 && (
                  <> · <span className="font-semibold text-[#a5a0ff]">{formatMoney(totalRevenue)}</span> revenue</>
                )}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-rz-subtle transition hover:bg-white/[0.07] hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Summary strip */}
        {!loading && !error && bookings.length > 0 && (
          <div className="flex gap-4 border-b border-white/[0.07] px-6 py-3">
            <div className="flex items-center gap-1.5 text-xs text-rz-muted">
              <Calendar className="h-3.5 w-3.5 text-rz-accent" />
              <span>{bookings.length} appointment{bookings.length !== 1 ? "s" : ""}</span>
            </div>
            {totalRevenue > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-rz-muted">
                <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                <span>{formatMoney(totalRevenue)} total</span>
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-rz-accent" />
            </div>
          )}

          {!loading && error && (
            <div className="px-6 py-8 text-center text-sm text-red-400">{error}</div>
          )}

          {!loading && !error && bookings.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Calendar className="h-10 w-10 text-rz-subtle/50" />
              <p className="font-medium text-white">No bookings for this period</p>
              <p className="text-sm text-rz-muted">Nothing to show here yet.</p>
            </div>
          )}

          {!loading && !error && bookings.length > 0 && (
            <ul className="divide-y divide-white/[0.05]">
              {bookings.map((b) => (
                <li key={b.id} className="flex flex-col gap-2 px-6 py-4 transition-colors hover:bg-white/[0.02]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">
                        {b.customer?.fullName ?? "Unknown customer"}
                      </p>
                      <p className="mt-0.5 text-sm text-rz-accent">
                        {b.service?.name ?? "Service"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <StatusBadge status={b.status} />
                      {b.pricePenceSnapshot > 0 && (
                        <span className="text-sm font-semibold text-white">
                          {formatMoney(b.pricePenceSnapshot)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-rz-muted">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(b.startsAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(b.startsAt)} – {formatTime(b.endsAt)}
                    </span>
                    {b.staffMember && (
                      <span className="text-rz-subtle">with {b.staffMember.fullName}</span>
                    )}
                    {b.customer?.email && (
                      <span className="truncate text-rz-subtle">{b.customer.email}</span>
                    )}
                  </div>

                  {b.notes && (
                    <p className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-rz-muted">
                      {b.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.07] px-6 py-4">
          <a
            href="/dashboard/bookings"
            className="flex items-center gap-1 text-sm font-medium text-[#a5a0ff] transition hover:text-white"
          >
            Manage all bookings <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── Main export: stat tiles + modal trigger ── */
export function StatsWithModal({ stats }: { stats: StatConfig[] }) {
  const [activePeriod, setActivePeriod] = useState<Period | null>(null);

      const clickable = new Set<string>(["today", "week", "month", "upcoming"]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ key, label, value }) => {
          const isClickable = clickable.has(key);
          return isClickable ? (
            <button
              key={key}
              type="button"
              onClick={() => setActivePeriod(key as Period)}
              className="rz-card-hover group relative cursor-pointer p-5 text-left transition-all hover:border-[#8b86f9]/40 hover:shadow-[0_0_0_1px_rgba(139,134,249,0.15)]"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-rz-subtle">{label}</p>
              <p className="mt-2 text-3xl font-extrabold text-white">{value}</p>
              <span className="absolute bottom-3 right-4 flex items-center gap-1 text-[10px] font-medium text-rz-accent opacity-0 transition-opacity group-hover:opacity-100">
                View bookings <ChevronRight className="h-3 w-3" />
              </span>
            </button>
          ) : (
            <div key={key} className="rz-card-hover p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-rz-subtle">{label}</p>
              <p className="mt-2 text-3xl font-extrabold text-white">{value}</p>
            </div>
          );
        })}
      </div>

      {activePeriod && (
        <PeriodModal period={activePeriod} onClose={() => setActivePeriod(null)} />
      )}
    </>
  );
}
