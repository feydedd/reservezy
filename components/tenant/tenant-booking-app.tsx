"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

type TenantPayload = {
  business: {
    name: string;
    subdomain: string;
    timezone: string;
    slotMode: string;
    allowCustomerStaffSelection: boolean;
    allowCustomerCancelReschedule: boolean;
  };
  branding: {
    logoUrl: string | null;
    primaryColour: string | null;
    secondaryColour: string | null;
    googleFontFamily: string | null;
  };
  services: Array<{
    id: string;
    name: string;
    description: string;
    durationMinutes: number;
    pricePence: number;
  }>;
  staff: Array<{ id: string; fullName: string; offeredServiceIds: string[] }>;
};

type Step = "service" | "staff" | "date" | "time" | "details" | "done";

function formatMoney(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

export function TenantBookingApp({ subdomain }: { subdomain: string }) {
  const [payload, setPayload] = useState<TenantPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("service");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Array<{ startsAt: string; endsAt: string }>>(
    [],
  );
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotChoice, setSlotChoice] = useState<{
    startsAt: string;
    endsAt: string;
  } | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    bookingId: string;
    managementToken: string;
  } | null>(null);

  const basePath = `/api/public/tenant/${encodeURIComponent(subdomain)}`;

  useEffect(() => {
    fetch(basePath)
      .then(async (res) => {
        if (!res.ok) {
          setLoadError("This booking page is not available.");
          return;
        }
        setPayload((await res.json()) as TenantPayload);
      })
      .catch(() => setLoadError("Unable to load business."));
  }, [basePath]);

  const selectedService = useMemo(
    () => payload?.services.find((s) => s.id === serviceId) ?? null,
    [payload, serviceId],
  );

  const staffRequired =
    Boolean(payload?.business.allowCustomerStaffSelection) &&
    (payload?.staff.length ?? 0) > 0;

  const eligibleStaff = useMemo(() => {
    if (!payload || !serviceId) {
      return [];
    }
    return payload.staff.filter((member) =>
      member.offeredServiceIds.includes(serviceId),
    );
  }, [payload, serviceId]);

  const loadSlots = useCallback(async () => {
    if (!serviceId || !date) {
      return;
    }
    if (staffRequired && !staffId) {
      return;
    }
    setSlotsLoading(true);
    setSubmitError(null);
    try {
      const params = new URLSearchParams({
        serviceId,
        date,
      });
      if (staffId) {
        params.set("staffMemberId", staffId);
      }
      const res = await fetch(`${basePath}/availability?${params.toString()}`);
      const body = (await res.json()) as { slots?: unknown; error?: string };
      if (!res.ok) {
        setSubmitError(body.error ?? "Could not load availability.");
        setSlots([]);
        return;
      }
      setSlots(Array.isArray(body.slots) ? (body.slots as typeof slots) : []);
    } catch {
      setSubmitError("Availability request failed.");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [basePath, date, serviceId, staffId, staffRequired]);

  useEffect(() => {
    if (step === "time" && serviceId && date) {
      loadSlots().catch(() => null);
    }
  }, [step, serviceId, date, staffId, loadSlots]);

  const brandingStyle = useMemo(() => {
    if (!payload?.branding.primaryColour && !payload?.branding.googleFontFamily) {
      return undefined;
    }
    return {
      fontFamily: payload.branding.googleFontFamily ?? undefined,
      ["--tenant-primary" as string]: payload.branding.primaryColour ?? "#8b86f9",
      ["--tenant-secondary" as string]:
        payload.branding.secondaryColour ?? "#c4b5fd",
    } as CSSProperties;
  }, [payload]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-500/35 bg-red-950/40 p-8 text-center text-red-200 backdrop-blur-sm">
        {loadError}
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-[#11111f]/90 p-10 text-center text-sm text-slate-500 backdrop-blur-xl">
        Loading booking experience…
      </div>
    );
  }

  const primary =
    payload.branding.primaryColour && payload.branding.primaryColour.startsWith("#")
      ? payload.branding.primaryColour
      : "#8b86f9";

  const submitBooking = async () => {
    if (!selectedService || !slotChoice) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${basePath}/bookings`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          staffMemberId: staffId,
          startsAt: slotChoice.startsAt,
          endsAt: slotChoice.endsAt,
          customerFullName: customerName,
          customerEmail: customerEmail,
          customerPhone: customerPhone,
          notes,
        }),
      });
      const bodyUnknown: unknown = await res.json();
      if (!res.ok && bodyUnknown && typeof bodyUnknown === "object") {
        const message = String(
          (bodyUnknown as { error?: string }).error ?? "Booking failed.",
        );
        setSubmitError(message);
        setSubmitting(false);
        return;
      }
      if (
        !bodyUnknown ||
        typeof bodyUnknown !== "object" ||
        !("bookingId" in bodyUnknown)
      ) {
        setSubmitError("Unexpected server response.");
        setSubmitting(false);
        return;
      }
      const body = bodyUnknown as {
        bookingId: string;
        managementToken: string;
      };
      setConfirmation({
        bookingId: body.bookingId,
        managementToken: body.managementToken,
      });
      setStep("done");
    } catch {
      setSubmitError("Network error while booking.");
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation && step === "done") {
    return (
      <div
        className="mx-auto max-w-lg space-y-4 rounded-2xl border border-[#8b86f9]/35 bg-[#11111f]/95 p-8 shadow-[0_0_32px_rgba(139,134,249,0.15)] backdrop-blur-xl"
        style={brandingStyle}
      >
        <p className="text-xs uppercase tracking-[0.35em]" style={{ color: primary }}>
          Confirmed
        </p>
        <h1 className="text-2xl font-semibold text-white">
          Thanks {customerName.split(" ")[0] ?? ""} — you are booked.
        </h1>
        <p className="text-sm text-slate-400">
          Reference <span className="font-mono font-semibold">{confirmation.bookingId}</span>
        </p>
        {payload.business.allowCustomerCancelReschedule && (
          <p className="text-xs text-slate-500">
            Manage token (keep private):{" "}
            <span className="font-mono">{confirmation.managementToken}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="mx-auto max-w-2xl space-y-8 rounded-3xl border border-white/10 bg-[#11111f]/95 p-8 shadow-[0_0_40px_rgba(139,134,249,0.12)] backdrop-blur-xl"
      style={brandingStyle}
    >
      <header className="space-y-2 text-center">
        {payload.branding.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote owner logos
          <img
            src={payload.branding.logoUrl}
            alt=""
            className="mx-auto h-16 w-auto object-contain"
          />
        ) : null}
        <p className="text-xs uppercase tracking-[0.35em]" style={{ color: primary }}>
          Book online
        </p>
        <h1 className="text-3xl font-semibold text-white">{payload.business.name}</h1>
        <p className="text-sm text-slate-500">{payload.business.timezone}</p>
      </header>

      {step === "service" && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Choose a service</h2>
          <div className="space-y-3">
            {payload.services.map((svc) => (
              <button
                key={svc.id}
                type="button"
                onClick={() => {
                  setServiceId(svc.id);
                  setStaffId(null);
                  setStep(staffRequired ? "staff" : "date");
                }}
                className="flex w-full flex-col rounded-2xl border border-white/10 px-4 py-3 text-left transition hover:border-[#8b86f9]/50 hover:bg-[#8b86f9]/10"
              >
                <span className="text-base font-semibold text-white">{svc.name}</span>
                <span className="text-sm text-slate-400">
                  {svc.durationMinutes} minutes · {formatMoney(svc.pricePence)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === "staff" && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Pick a teammate</h2>
          <div className="space-y-3">
            {eligibleStaff.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => {
                  setStaffId(member.id);
                  setStep("date");
                }}
                className="w-full rounded-2xl border border-white/10 px-4 py-3 text-left font-semibold text-white transition hover:border-[#8b86f9]/50"
              >
                {member.fullName}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="text-sm font-semibold text-slate-500 underline"
            onClick={() => setStep("service")}
          >
            Back
          </button>
        </section>
      )}

      {step === "date" && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Pick a date</h2>
          <input
            type="date"
            className="w-full rounded-xl border border-white/15 bg-[#080810]/90 px-3 py-2 text-slate-100 [color-scheme:dark]"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <div className="flex gap-3">
            <button
              type="button"
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
              onClick={() => setStep(staffRequired ? "staff" : "service")}
            >
              Back
            </button>
            <button
              type="button"
              disabled={!date}
              className="rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: primary }}
              onClick={() => setStep("time")}
            >
              Continue
            </button>
          </div>
        </section>
      )}

      {step === "time" && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Pick a time</h2>
          {slotsLoading && <p className="text-sm text-slate-500">Checking openings…</p>}
          {!slotsLoading && slots.length === 0 && (
            <p className="text-sm text-amber-300/90">
              No openings that day — try another date.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.map((slot) => {
              const label = new Date(slot.startsAt).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <button
                  key={slot.startsAt}
                  type="button"
                  onClick={() => {
                    setSlotChoice(slot);
                    setStep("details");
                  }}
                  className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-[#8b86f9]/50"
                >
                  {label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="text-sm font-semibold text-slate-500 underline"
            onClick={() => setStep("date")}
          >
            Back
          </button>
        </section>
      )}

      {step === "details" && selectedService && slotChoice && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Your details</h2>
          <label className="block text-sm font-semibold text-slate-200">
            Full name
            <input
              className="mt-1 w-full rounded-xl border border-white/15 bg-[#080810]/90 px-3 py-2 font-normal text-slate-100 placeholder:text-slate-500"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-200">
            Email
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-white/15 bg-[#080810]/90 px-3 py-2 font-normal text-slate-100 placeholder:text-slate-500"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-200">
            Phone
            <input
              className="mt-1 w-full rounded-xl border border-white/15 bg-[#080810]/90 px-3 py-2 font-normal text-slate-100 placeholder:text-slate-500"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-200">
            Notes (optional)
            <textarea
              className="mt-1 w-full rounded-xl border border-white/15 bg-[#080810]/90 px-3 py-2 font-normal text-slate-100 placeholder:text-slate-500"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          {submitError && (
            <p className="text-sm font-semibold text-red-400">{submitError}</p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
              onClick={() => setStep("time")}
            >
              Back
            </button>
            <button
              type="button"
              disabled={
                submitting ||
                customerName.trim().length < 2 ||
                !customerEmail.includes("@")
              }
              className="rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: primary }}
              onClick={submitBooking}
            >
              {submitting ? "Booking…" : "Confirm booking"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
