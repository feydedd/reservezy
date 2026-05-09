"use client";

import { useCallback, useEffect, useState } from "react";

type BookingData = {
  bookingId: string;
  status: string;
  startsAt: string;
  endsAt: string;
  service: { name: string; durationMinutes: number; pricePence: number };
  staffMember: { fullName: string } | null;
  customer: { fullName: string; email: string };
  business: {
    name: string;
    subdomain: string;
    timezone: string;
    allowCancelReschedule: boolean;
    cancellationNoticeHours: number;
  };
};

function formatMoney(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

function formatDt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ManageBookingClient({ token }: { token: string }) {
  const [data, setData] = useState<BookingData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<"details" | "reschedule" | "done">("details");
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");

  // Reschedule form state
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  const apiUrl = `/api/public/bookings/manage/${encodeURIComponent(token)}`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) {
        const b = (await res.json()) as { error?: string };
        setLoadError(b.error ?? "Booking not found.");
        return;
      }
      setData((await res.json()) as BookingData);
    } catch {
      setLoadError("Unable to load booking details.");
    }
  }, [apiUrl]);

  useEffect(() => { load().catch(() => null); }, [load]);

  const doCancel = async () => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const b = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) { setActionError(b.error ?? "Could not cancel."); return; }
      setDoneMessage("Your appointment has been cancelled. We hope to see you again soon.");
      setView("done");
    } catch {
      setActionError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const doReschedule = async () => {
    if (!newDate || !newTime) { setActionError("Please pick a new date and time."); return; }
    if (!data) return;

    const newStartsAt = new Date(`${newDate}T${newTime}:00`);
    const newEndsAt = new Date(newStartsAt.getTime() + data.service.durationMinutes * 60 * 1000);

    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          startsAt: newStartsAt.toISOString(),
          endsAt: newEndsAt.toISOString(),
        }),
      });
      const b = (await res.json()) as { ok?: boolean; startsAt?: string; error?: string };
      if (!res.ok) { setActionError(b.error ?? "Could not reschedule."); return; }
      setDoneMessage(`Rescheduled! Your new appointment is ${formatDt(b.startsAt!)}.`);
      setView("done");
    } catch {
      setActionError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-red-500/25 bg-red-950/30 p-10 text-center">
        <p className="text-lg font-bold text-white">Booking not found</p>
        <p className="mt-2 text-sm text-rz-muted">{loadError}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-[#13132c]/90 p-10 text-center text-rz-muted">
        Loading your booking…
      </div>
    );
  }

  if (view === "done") {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-[#8b86f9]/30 bg-[#13132c]/90 p-10 text-center shadow-[0_0_40px_rgba(139,134,249,0.15)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b86f9] to-[#6d66f0]">
          <span className="text-2xl">✓</span>
        </div>
        <h1 className="text-xl font-extrabold text-white">Done!</h1>
        <p className="mt-3 text-sm leading-relaxed text-rz-muted">{doneMessage}</p>
        <a
          href={`http://${data.business.subdomain}.reservezy.com`}
          className="rz-btn-primary mt-8 inline-flex"
        >
          Book again →
        </a>
      </div>
    );
  }

  const isCancellable =
    data.status === "CONFIRMED" &&
    data.business.allowCancelReschedule &&
    new Date(data.startsAt).getTime() - Date.now() >
      data.business.cancellationNoticeHours * 60 * 60 * 1000;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Booking card */}
      <div className="rz-card p-8">
        <p className="rz-badge mb-4 inline-flex">
          {data.status === "CONFIRMED" ? "✓ Confirmed" : data.status}
        </p>
        <h1 className="text-2xl font-extrabold text-white">{data.business.name}</h1>
        <p className="mt-1 text-sm text-rz-muted">Hello, {data.customer.fullName}</p>

        <dl className="mt-6 space-y-4">
          <div>
            <dt className="text-xs font-bold uppercase tracking-widest text-rz-subtle">Service</dt>
            <dd className="mt-1 text-base font-semibold text-white">
              {data.service.name} &middot; {data.service.durationMinutes} min &middot;{" "}
              {formatMoney(data.service.pricePence)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-widest text-rz-subtle">Date &amp; time</dt>
            <dd className="mt-1 text-base font-semibold text-white">{formatDt(data.startsAt)}</dd>
          </div>
          {data.staffMember && (
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-rz-subtle">With</dt>
              <dd className="mt-1 text-base font-semibold text-white">{data.staffMember.fullName}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-bold uppercase tracking-widest text-rz-subtle">Reference</dt>
            <dd className="mt-1 font-mono text-sm text-rz-muted">{data.bookingId}</dd>
          </div>
        </dl>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {actionError}
        </div>
      )}

      {/* Actions */}
      {isCancellable && view === "details" && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={() => { setActionError(null); setView("reschedule"); }}
            className="rz-btn-primary flex-1 py-3"
          >
            Reschedule
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={doCancel}
            className="rz-btn-ghost flex-1 py-3 text-red-400 hover:border-red-500/40 hover:text-red-300"
          >
            Cancel appointment
          </button>
        </div>
      )}

      {!data.business.allowCancelReschedule && data.status === "CONFIRMED" && (
        <p className="text-center text-sm text-rz-muted">
          To make changes, please contact {data.business.name} directly.
        </p>
      )}

      {!isCancellable && data.business.allowCancelReschedule && data.status === "CONFIRMED" && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Changes must be made at least {data.business.cancellationNoticeHours} hours before your appointment.
        </div>
      )}

      {/* Reschedule form */}
      {view === "reschedule" && (
        <div className="rz-card space-y-5 p-7">
          <h2 className="text-lg font-bold text-white">Choose a new time</h2>
          <p className="text-sm text-rz-muted">
            Service duration: {data.service.durationMinutes} minutes.
          </p>
          <label className="block space-y-1.5 text-sm">
            <span className="font-semibold text-rz-muted">New date</span>
            <input
              type="date"
              className="rz-field [color-scheme:dark]"
              value={newDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-semibold text-rz-muted">Start time</span>
            <input
              type="time"
              className="rz-field [color-scheme:dark]"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
            />
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setView("details"); setActionError(null); }}
              className="rz-btn-ghost flex-1 py-3"
              disabled={busy}
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={busy || !newDate || !newTime}
              onClick={doReschedule}
              className="rz-btn-primary flex-1 py-3"
            >
              {busy ? "Rescheduling…" : "Confirm new time"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
