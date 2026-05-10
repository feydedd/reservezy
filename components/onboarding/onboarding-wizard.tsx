"use client";

import type { JSX } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const STEPS: { id: number; label: string; short: string }[] = [
  { id: 3, label: "Branding",     short: "Brand"    },
  { id: 4, label: "Hours",        short: "Hours"    },
  { id: 5, label: "Services",     short: "Services" },
  { id: 6, label: "Team",         short: "Team"     },
  { id: 7, label: "Rules",        short: "Rules"    },
  { id: 8, label: "Billing",      short: "Billing"  },
];

const TIER_INFO = {
  BASIC: {
    price: "£14.99/mo",
    color: "text-slate-300",
    badge: "bg-white/[0.06] text-slate-300",
    features: [
      "Public booking page",
      "Bookings & calendar dashboard",
      "Buffer time & holiday closures",
      "Email confirmations",
    ],
  },
  STANDARD: {
    price: "£29.99/mo",
    color: "text-rz-accent",
    badge: "bg-[#8b86f9]/15 text-rz-accent",
    features: [
      "Everything in Basic",
      "Email & SMS reminders",
      "Staff management",
      "Customer staff selection",
    ],
  },
  PREMIUM: {
    price: "£49.99/mo",
    color: "text-yellow-300",
    badge: "bg-yellow-400/10 text-yellow-300",
    features: [
      "Everything in Standard",
      "Google Calendar & Outlook sync",
      "Custom branding (logo, colours, fonts)",
      "Full analytics dashboard",
      "Customer cancel & reschedule links",
    ],
  },
} as const;

type WorkingHourDraft  = { dayOfWeek: number; openMinutes: number; closeMinutes: number };
type HolidayDraft      = { date: string; label?: string };
type ServiceDraft      = { id?: string; name: string; description?: string; durationMinutes: number; pricePence: number; sortOrder: number };
type StaffDraft        = { fullName: string; email: string; password: string; offeredServiceIds: string[]; workingHours: WorkingHourDraft[] };

type OnboardingApiPayload = {
  business: Record<string, unknown>;
  branding: { logoUrl?: string | null; primaryColour?: string | null; secondaryColour?: string | null; googleFontFamily?: string | null } | null;
  availability: { workingHours: WorkingHourDraft[]; holidays: HolidayDraft[] };
  services: ServiceDraft[];
  staff: StaffDraft[];
  navigation: { nextWizardStep: number | null; checkoutUnlocked: boolean };
};

function splitTime(m: number) {
  return `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
}
function parseTime(v: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(v);
  if (!match) return null;
  const hh = Number(match[1]), mm = Number(match[2]);
  if (hh >= 24 || mm >= 60) return null;
  return hh * 60 + mm;
}

/* ── Checkout return banner ──────────────────────────────────────────────── */
export function CheckoutReturnBanner(): JSX.Element | null {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const state  = params.get("checkout");

    if (state === "success") {
      setMessage("Stripe is finalising your subscription — we'll redirect you automatically once it's confirmed.");
      params.delete("checkout");
      window.history.replaceState({}, "", window.location.pathname);
      let attempts = 0;
      const poll = async () => {
        attempts++;
        const res  = await fetch("/api/onboarding");
        const body = await res.json();
        if (body?.business?.onboardingComplete) { window.location.href = "/dashboard"; return; }
        if (attempts < 20) window.setTimeout(poll, 2000);
        else setMessage("Still waiting — refresh the page in a moment, or head to your dashboard manually.");
      };
      poll().catch(() => null);
    } else if (state === "cancel") {
      setMessage("Checkout cancelled — your plan hasn't changed.");
      params.delete("checkout");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  if (!message) return null;
  return (
    <div className="rounded-2xl border border-[#8b86f9]/30 bg-[#8b86f9]/10 px-5 py-4 text-sm text-[#c4b5fd]">
      {message}
    </div>
  );
}

/* ── Main wizard ─────────────────────────────────────────────────────────── */
export function OnboardingWizard() {
  const router = useRouter();
  const [loadError,  setLoadError]  = useState<string | null>(null);
  const [savingStep, setSavingStep] = useState<number | null>(null);
  const [payload,    setPayload]    = useState<OnboardingApiPayload | null>(null);
  const [activeStep, setActiveStep] = useState(3);

  const [brandLogo,      setBrandLogo]      = useState("");
  const [brandPrimary,   setBrandPrimary]   = useState("");
  const [brandSecondary, setBrandSecondary] = useState("");
  const [brandFont,      setBrandFont]      = useState("");

  const [bufferMinutes,  setBufferMinutes]  = useState(15);
  const [businessHours,  setBusinessHours]  = useState<WorkingHourDraft[]>([]);
  const [holidays,       setHolidays]       = useState<HolidayDraft[]>([]);

  const [slotMode,       setSlotMode]       = useState<"FIXED" | "FLEXIBLE">("FLEXIBLE");
  const [serviceDrafts,  setServiceDrafts]  = useState<ServiceDraft[]>([]);

  const [allowStaffSelector, setAllowStaffSelector] = useState(false);
  const [staffDrafts,        setStaffDrafts]        = useState<StaffDraft[]>([]);

  const [allowGuestCancel,   setAllowGuestCancel]   = useState(false);
  const [cancelNoticeHours,  setCancelNoticeHours]  = useState(24);

  useEffect(() => {
    fetch("/api/onboarding")
      .then(async (res) => {
        if (!res.ok) { setLoadError("Unable to load onboarding data."); return; }
        const data = (await res.json()) as OnboardingApiPayload;
        setPayload(data);
        setActiveStep(data.navigation.nextWizardStep ?? 3);
        setBrandLogo(String(data.branding?.logoUrl ?? ""));
        setBrandPrimary(String(data.branding?.primaryColour ?? ""));
        setBrandSecondary(String(data.branding?.secondaryColour ?? ""));
        setBrandFont(String(data.branding?.googleFontFamily ?? ""));
        setBufferMinutes(Number(data.business.bookingBufferMinutes ?? 15));
        const hours = [...(data.availability.workingHours ?? [])].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
        setBusinessHours(hours.length ? hours : [1,2,3,4,5].map(d => ({ dayOfWeek: d, openMinutes: 9*60, closeMinutes: 17*60 })));
        setHolidays(data.availability.holidays ?? []);
        setSlotMode(String(data.business.slotMode ?? "FLEXIBLE") === "FIXED" ? "FIXED" : "FLEXIBLE");
        setServiceDrafts((data.services ?? []).map((s, i) => ({ id: s.id, name: s.name, description: s.description ?? "", durationMinutes: s.durationMinutes, pricePence: s.pricePence, sortOrder: s.sortOrder ?? i })));
        setAllowStaffSelector(Boolean(data.business.allowCustomerStaffSelection));
        setStaffDrafts(Array.isArray(data.staff) ? (data.staff as StaffDraft[]).map(m => ({ fullName: m.fullName, email: m.email, password: "", offeredServiceIds: [...(m.offeredServiceIds ?? [])], workingHours: [...(m.workingHours ?? [])] })) : []);
        setAllowGuestCancel(Boolean(data.business.allowCustomerCancelReschedule));
        setCancelNoticeHours(Number(data.business.cancellationNoticeHours ?? 24) || 24);
      })
      .catch(() => setLoadError("Network error loading your workspace."));
  }, []);

  const serviceIdOptions = useMemo(() => serviceDrafts.filter(s => Boolean(s.id)), [serviceDrafts]);

  const mutateStep = async (body: Record<string, unknown>, stepMarker: number) => {
    setSavingStep(stepMarker);
    setLoadError(null);
    try {
      const res  = await fetch("/api/onboarding", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data: unknown = await res.json();
      if (!res.ok) {
        setLoadError((data as { error?: string })?.error ?? "Save failed — please try again.");
        setSavingStep(null); return;
      }
      const next = data as OnboardingApiPayload;
      setPayload(next);
      setActiveStep(next.navigation.nextWizardStep ?? stepMarker + 1);
      router.refresh();
    } catch { setLoadError("Network error — please try again."); }
    setSavingStep(null);
  };

  const startStripeCheckout = async (tier: "BASIC" | "STANDARD" | "PREMIUM") => {
    setSavingStep(8);
    setLoadError(null);
    try {
      const res  = await fetch("/api/billing/onboarding-checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tier }) });
      const data: unknown = await res.json();
      if (!res.ok) {
        const msg = (data as { error?: string })?.error ?? "Stripe checkout failed.";
        const isConfig = msg.toLowerCase().includes("price") || msg.toLowerCase().includes("configure") || msg.toLowerCase().includes("stripe");
        setLoadError(isConfig ? "Stripe isn't fully configured yet — price IDs must be \"price_...\" format (not \"prod_...\"). Update STRIPE_PRICE_* env vars in Vercel with the correct price IDs from your Stripe dashboard." : msg);
        setSavingStep(null); return;
      }
      const url = (data as { url?: string })?.url;
      if (!url) { setLoadError("Stripe didn't return a checkout URL."); setSavingStep(null); return; }
      window.location.href = url;
    } catch { setLoadError("Unable to reach Stripe — please try again."); setSavingStep(null); }
  };

  const skipBilling = async () => {
    setSavingStep(9);
    setLoadError(null);
    try {
      const res  = await fetch("/api/onboarding", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ step: "skipBilling", data: {} }) });
      const data: unknown = await res.json();
      if (!res.ok) { setLoadError((data as { error?: string })?.error ?? "Couldn't skip — please try again."); setSavingStep(null); return; }
      router.push("/dashboard");
      router.refresh();
    } catch { setLoadError("Network error."); setSavingStep(null); }
  };

  /* ── Step rail ──────────────────────────────────────────────────────────── */
  const StepRail = () => (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const done    = s.id < activeStep;
        const current = s.id === activeStep;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveStep(s.id)}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-semibold transition ${
              current
                ? "bg-gradient-to-b from-[#8b86f9] to-[#6d66f0] text-white shadow-[0_0_16px_rgba(139,134,249,0.3)]"
                : done
                ? "bg-[#8b86f9]/15 text-rz-accent"
                : "bg-white/[0.04] text-rz-subtle hover:bg-white/[0.07] hover:text-rz-muted"
            }`}
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${current ? "bg-white/20" : done ? "bg-[#8b86f9]/30" : "bg-white/[0.07]"}`}>
              {done ? "✓" : i + 1}
            </span>
            <span className="hidden sm:block">{s.label}</span>
            <span className="sm:hidden">{s.short}</span>
          </button>
        );
      })}
    </div>
  );

  /* ── Shared panel wrapper ────────────────────────────────────────────────── */
  const Panel = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
    <div className="rounded-2xl border border-[#8b86f9]/12 bg-[#13132c]/90 p-6 shadow-xl shadow-black/30 backdrop-blur-sm">
      <div className="mb-5 space-y-1">
        <h2 className="text-lg font-extrabold text-white">{title}</h2>
        {description && <p className="text-sm text-rz-muted">{description}</p>}
      </div>
      {children}
    </div>
  );

  const SaveBtn = ({ step, label = "Save & continue" }: { step: number; label?: string }) => (
    <button
      type="button"
      disabled={savingStep !== null}
      onClick={() => {
        if (step === 3) mutateStep({ step: "branding",     data: { logoUrl: brandLogo.trim(), primaryColour: brandPrimary.trim(), secondaryColour: brandSecondary.trim(), googleFontFamily: brandFont.trim() }}, 3);
        if (step === 4) mutateStep({ step: "availability", data: { bookingBufferMinutes: bufferMinutes, workingHours: businessHours, holidays }}, 4);
        if (step === 5) mutateStep({ step: "services",     data: { slotMode, services: serviceDrafts.map((s, i) => ({ ...(s.id ? { id: s.id } : {}), name: s.name, description: s.description ?? "", durationMinutes: s.durationMinutes, pricePence: s.pricePence, sortOrder: s.sortOrder ?? i })) }}, 5);
        if (step === 6) mutateStep({ step: "staff",        data: { allowCustomerStaffSelection: allowStaffSelector, members: staffDrafts.map(m => ({ fullName: m.fullName, email: m.email.toLowerCase(), password: m.password, offeredServiceIds: m.offeredServiceIds, workingHours: m.workingHours })) }}, 6);
        if (step === 7) mutateStep({ step: "bookingRules", data: { allowCustomerStaffSelection: allowStaffSelector, allowCustomerCancelReschedule: allowGuestCancel, cancellationNoticeHours: cancelNoticeHours }}, 7);
      }}
      className="rz-btn-primary px-6 py-2.5 text-sm disabled:opacity-50"
    >
      {savingStep === step ? "Saving…" : label}
    </button>
  );

  /* ── Step panels ─────────────────────────────────────────────────────────── */
  const renderPanel = () => {
    switch (activeStep) {
      /* ── Step 3: Branding ─────────────────────────────────── */
      case 3:
        return (
          <Panel title="Branding" description="Add your logo and colours — these show on your booking page.">
            <div className="space-y-4">
              <label className="block space-y-1.5 text-sm">
                <span className="font-semibold text-rz-muted">Logo URL</span>
                <input className="rz-field" value={brandLogo} onChange={e => setBrandLogo(e.target.value)} placeholder="https://example.com/logo.png" />
                <span className="text-xs text-rz-subtle">Must be a public HTTPS image URL.</span>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5 text-sm">
                  <span className="font-semibold text-rz-muted">Primary colour</span>
                  <input className="rz-field font-mono" value={brandPrimary} placeholder="#8b86f9" onChange={e => setBrandPrimary(e.target.value.toUpperCase())} />
                </label>
                <label className="block space-y-1.5 text-sm">
                  <span className="font-semibold text-rz-muted">Secondary colour</span>
                  <input className="rz-field font-mono" value={brandSecondary} placeholder="#6d66f0" onChange={e => setBrandSecondary(e.target.value.toUpperCase())} />
                </label>
              </div>
              <label className="block space-y-1.5 text-sm">
                <span className="font-semibold text-rz-muted">Google Font (optional)</span>
                <input className="rz-field" value={brandFont} placeholder="e.g. Inter" onChange={e => setBrandFont(e.target.value)} />
              </label>
              <SaveBtn step={3} />
            </div>
          </Panel>
        );

      /* ── Step 4: Hours ────────────────────────────────────── */
      case 4:
        return (
          <Panel title="Opening hours" description="Set when customers can book appointments.">
            <div className="space-y-5">
              <label className="block space-y-1.5 text-sm">
                <span className="font-semibold text-rz-muted">Buffer between bookings (minutes)</span>
                <input type="number" min={0} max={240} className="rz-field w-28" value={bufferMinutes} onChange={e => setBufferMinutes(Number(e.target.value || 0))} />
              </label>

              <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.07] bg-white/[0.03] text-xs font-semibold uppercase tracking-widest text-rz-subtle">
                      <th className="px-4 py-3 text-left">Day</th>
                      <th className="px-4 py-3 text-left">Opens</th>
                      <th className="px-4 py-3 text-left">Closes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {businessHours.map((row, i) => (
                      <tr key={`${row.dayOfWeek}-${i}`} className="border-b border-white/[0.05] last:border-0">
                        <td className="px-4 py-2.5 font-semibold text-rz-muted">{DAY_LABELS[row.dayOfWeek]}</td>
                        <td className="px-4 py-2">
                          <input className="rz-field w-24 py-1.5 font-mono text-sm" value={splitTime(row.openMinutes)} onChange={e => { const v = parseTime(e.target.value); if (v !== null) setBusinessHours(p => p.map((r, j) => j === i ? { ...r, openMinutes: v } : r)); }} />
                        </td>
                        <td className="px-4 py-2">
                          <input className="rz-field w-24 py-1.5 font-mono text-sm" value={splitTime(row.closeMinutes)} onChange={e => { const v = parseTime(e.target.value); if (v !== null) setBusinessHours(p => p.map((r, j) => j === i ? { ...r, closeMinutes: v } : r)); }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Holiday closures</p>
                  <button type="button" onClick={() => setHolidays(h => [...h, { date: "", label: "" }])} className="text-xs font-semibold text-rz-accent hover:text-rz-accent-light">+ Add closure</button>
                </div>
                {holidays.length === 0 && <p className="text-sm text-rz-subtle">No closures added — you can add these anytime from your dashboard.</p>}
                {holidays.map((h, i) => (
                  <div key={`${h.date}-${i}`} className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-rz-muted">
                      Date (YYYY-MM-DD)
                      <input className="rz-field font-mono" value={h.date} onChange={e => setHolidays(p => p.map((r, j) => j === i ? { ...r, date: e.target.value } : r))} />
                    </label>
                    <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-rz-muted">
                      Label
                      <input className="rz-field" value={h.label ?? ""} placeholder="e.g. Bank holiday" onChange={e => setHolidays(p => p.map((r, j) => j === i ? { ...r, label: e.target.value } : r))} />
                    </label>
                    <button type="button" onClick={() => setHolidays(p => p.filter((_, j) => j !== i))} className="mb-[3px] text-xs font-semibold text-red-400 hover:text-red-300">Remove</button>
                  </div>
                ))}
              </div>

              <SaveBtn step={4} />
            </div>
          </Panel>
        );

      /* ── Step 5: Services ─────────────────────────────────── */
      case 5:
        return (
          <Panel title="Your services" description="Add the services customers can book. You can edit these anytime.">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={slotMode === "FLEXIBLE"} onChange={() => setSlotMode("FLEXIBLE")} className="accent-[#8b86f9]" />
                  <span className="font-semibold text-rz-muted">Flexible windows</span>
                  <span className="text-xs text-rz-subtle">(book any open slot)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={slotMode === "FIXED"} onChange={() => setSlotMode("FIXED")} className="accent-[#8b86f9]" />
                  <span className="font-semibold text-rz-muted">Fixed time slots</span>
                  <span className="text-xs text-rz-subtle">(discrete bookable slots)</span>
                </label>
              </div>

              <div className="space-y-3">
                {serviceDrafts.map((svc, i) => (
                  <div key={svc.id ?? `${svc.name}-${i}`} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <input className="rz-field flex-1 font-semibold" value={svc.name} placeholder="Service name" onChange={e => setServiceDrafts(p => p.map((r, j) => j === i ? { ...r, name: e.target.value } : r))} />
                      <button type="button" onClick={() => setServiceDrafts(p => p.filter((_, j) => j !== i))} className="text-xs font-semibold text-red-400 hover:text-red-300">Remove</button>
                    </div>
                    <textarea rows={2} className="rz-field resize-none text-sm" placeholder="Description (optional)" value={svc.description ?? ""} onChange={e => setServiceDrafts(p => p.map((r, j) => j === i ? { ...r, description: e.target.value } : r))} />
                    <div className="grid grid-cols-2 gap-3">
                      <label className="space-y-1 text-xs font-semibold text-rz-muted">
                        Duration (minutes)
                        <input type="number" min={5} className="rz-field mt-1" value={svc.durationMinutes} onChange={e => setServiceDrafts(p => p.map((r, j) => j === i ? { ...r, durationMinutes: Number(e.target.value || 0) } : r))} />
                      </label>
                      <label className="space-y-1 text-xs font-semibold text-rz-muted">
                        Price (£)
                        <input type="number" min={0} step={0.5} className="rz-field mt-1" value={svc.pricePence / 100} onChange={e => setServiceDrafts(p => p.map((r, j) => j === i ? { ...r, pricePence: Math.round(Number(e.target.value || 0) * 100) } : r))} />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" onClick={() => setServiceDrafts(p => [...p, { name: "New service", description: "", durationMinutes: 45, pricePence: 4000, sortOrder: p.length }])} className="rz-btn-ghost w-full py-2.5 text-sm">
                + Add service
              </button>

              <SaveBtn step={5} label={serviceDrafts.length === 0 ? "Skip for now" : "Save & continue"} />
            </div>
          </Panel>
        );

      /* ── Step 6: Team ──────────────────────────────────────── */
      case 6:
        return (
          <Panel title="Team members" description="Add staff who take bookings. Optional — you can do this later from the dashboard.">
            <div className="space-y-4">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input type="checkbox" checked={allowStaffSelector} onChange={e => setAllowStaffSelector(e.target.checked)} className="accent-[#8b86f9]" />
                <span className="font-semibold text-rz-muted">Let customers choose a specific team member when booking</span>
              </label>

              <div className="space-y-3">
                {staffDrafts.map((m, i) => (
                  <div key={`${m.email}-${i}`} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-white">Team member {i + 1}</p>
                      <button type="button" onClick={() => setStaffDrafts(p => p.filter((_, j) => j !== i))} className="text-xs font-semibold text-red-400 hover:text-red-300">Remove</button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1 text-xs font-semibold text-rz-muted">
                        Full name
                        <input className="rz-field mt-1" value={m.fullName} onChange={e => setStaffDrafts(p => p.map((r, j) => j === i ? { ...r, fullName: e.target.value } : r))} />
                      </label>
                      <label className="space-y-1 text-xs font-semibold text-rz-muted">
                        Email
                        <input type="email" className="rz-field mt-1" value={m.email} onChange={e => setStaffDrafts(p => p.map((r, j) => j === i ? { ...r, email: e.target.value } : r))} />
                      </label>
                    </div>
                    <label className="space-y-1 text-xs font-semibold text-rz-muted">
                      Password (for dashboard login)
                      <input type="password" className="rz-field mt-1" value={m.password} placeholder="At least 8 characters" onChange={e => setStaffDrafts(p => p.map((r, j) => j === i ? { ...r, password: e.target.value } : r))} />
                    </label>
                    {serviceIdOptions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-widest text-rz-subtle">Services they offer</p>
                        <div className="flex flex-wrap gap-2">
                          {serviceIdOptions.map(svc => (
                            <label key={`${svc.id}-${svc.name}`} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/[0.08] px-3 py-1 text-xs font-semibold text-rz-muted hover:border-rz-accent/30">
                              <input type="checkbox" className="accent-[#8b86f9]" checked={m.offeredServiceIds.includes(String(svc.id ?? ""))} onChange={e => {
                                const id = String(svc.id);
                                setStaffDrafts(p => p.map((r, j) => j !== i ? r : { ...r, offeredServiceIds: e.target.checked ? Array.from(new Set([...r.offeredServiceIds, id])).filter(Boolean) : r.offeredServiceIds.filter(x => x !== id) }));
                              }} />
                              {svc.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button type="button" onClick={() => setStaffDrafts(p => [...p, { fullName: "", email: "", password: "", offeredServiceIds: [], workingHours: [] }])} className="rz-btn-ghost w-full py-2.5 text-sm">
                + Add team member
              </button>

              <SaveBtn
                step={6}
                label={
                  staffDrafts.length === 0
                    ? "Skip — I'm a solo operator"
                    : staffDrafts.some(m => !m.fullName.trim() || !m.email.trim() || m.password.trim().length < 8)
                    ? "Fill in all fields above"
                    : "Save team & continue"
                }
              />
            </div>
          </Panel>
        );

      /* ── Step 7: Booking rules ─────────────────────────────── */
      case 7:
        return (
          <Panel title="Booking rules" description="Control how customers manage their bookings.">
            <div className="space-y-5">
              <label className="block space-y-1.5 text-sm">
                <span className="font-semibold text-rz-muted">Minimum cancellation notice (hours)</span>
                <input type="number" min={1} max={336} className="rz-field w-28" value={cancelNoticeHours} onChange={e => setCancelNoticeHours(Number(e.target.value || 24))} />
                <span className="text-xs text-rz-subtle">Customers can&apos;t cancel within this window before their appointment.</span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input type="checkbox" checked={allowGuestCancel} onChange={e => setAllowGuestCancel(e.target.checked)} className="mt-0.5 accent-[#8b86f9]" />
                <span>
                  <span className="font-semibold text-rz-muted">Allow customers to cancel and reschedule via email link</span>
                  <span className="block mt-0.5 text-xs text-rz-subtle">Customers receive a magic link in their confirmation email. Available on Premium.</span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input type="checkbox" checked={allowStaffSelector} onChange={e => setAllowStaffSelector(e.target.checked)} className="mt-0.5 accent-[#8b86f9]" />
                <span>
                  <span className="font-semibold text-rz-muted">Show staff picker on booking page</span>
                  <span className="block mt-0.5 text-xs text-rz-subtle">Customers can choose their preferred team member.</span>
                </span>
              </label>

              <SaveBtn step={7} label="Save & see plans" />
            </div>
          </Panel>
        );

      /* ── Step 8: Billing ───────────────────────────────────── */
      case 8:
        return (
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#8b86f9]/12 bg-[#13132c]/90 p-6 shadow-xl shadow-black/30 backdrop-blur-sm">
              <div className="mb-6 space-y-1">
                <h2 className="text-lg font-extrabold text-white">Choose your plan</h2>
                <p className="text-sm text-rz-muted">
                  Pick a plan to activate your public booking page. You can upgrade or downgrade anytime.
                </p>
              </div>

              {!payload?.navigation.checkoutUnlocked && (
                <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  Complete steps 3–7 to unlock billing — or skip and explore the dashboard first.
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                {(["BASIC", "STANDARD", "PREMIUM"] as const).map(tier => {
                  const info = TIER_INFO[tier];
                  const isPopular = tier === "STANDARD";
                  return (
                    <div key={tier} className={`relative flex flex-col rounded-2xl border p-5 ${isPopular ? "border-[#8b86f9]/40 bg-[#8b86f9]/8 shadow-[0_0_24px_rgba(139,134,249,0.15)]" : "border-white/[0.08] bg-white/[0.02]"}`}>
                      {isPopular && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#8b86f9] to-[#6d66f0] px-3 py-0.5 text-[11px] font-bold text-white shadow-lg">
                          Most popular
                        </span>
                      )}
                      <div className="mb-4">
                        <p className={`text-xs font-bold uppercase tracking-widest ${info.color}`}>{tier}</p>
                        <p className={`mt-1 text-2xl font-extrabold ${info.color}`}>{info.price}</p>
                      </div>
                      <ul className="mb-5 flex-1 space-y-2">
                        {info.features.map(f => (
                          <li key={f} className="flex items-start gap-2 text-xs text-rz-muted">
                            <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#8b86f9]/15 text-[9px] text-rz-accent">✓</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        disabled={!payload?.navigation.checkoutUnlocked || savingStep !== null}
                        onClick={() => startStripeCheckout(tier)}
                        className={`w-full rounded-xl py-2.5 text-sm font-bold transition disabled:opacity-40 ${isPopular ? "bg-gradient-to-r from-[#8b86f9] to-[#6d66f0] text-white hover:brightness-110 shadow-[0_0_16px_rgba(139,134,249,0.3)]" : "border border-white/[0.12] bg-white/[0.04] text-rz-text hover:bg-white/[0.08]"}`}
                      >
                        {savingStep === 8 ? "Redirecting…" : `Start ${tier.charAt(0) + tier.slice(1).toLowerCase()}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Skip option */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 text-center">
              <p className="text-sm font-semibold text-white">Not ready to subscribe yet?</p>
              <p className="mt-1 text-sm text-rz-muted">
                Explore your dashboard first — your booking page will go live once you activate a plan.
              </p>
              <button
                type="button"
                disabled={savingStep !== null}
                onClick={skipBilling}
                className="rz-btn-ghost mt-4 px-6 py-2.5 text-sm disabled:opacity-50"
              >
                {savingStep === 9 ? "Just a moment…" : "Explore dashboard first →"}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  /* ── Loading / error states ──────────────────────────────────────────────── */
  if (loadError && !payload) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center text-sm text-red-300">
        {loadError}
        <button type="button" onClick={() => router.refresh()} className="ml-3 font-semibold underline">Reload</button>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-[#13132c]/80 p-10 text-center text-sm text-rz-subtle">
        Loading your workspace…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {loadError && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {loadError}
        </div>
      )}

      {/* Business info bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <p className="text-sm text-rz-muted">
          <span className="font-bold text-white">{payload.business.name as string}</span>
          <span className="mx-2 text-rz-subtle">·</span>
          <span className="font-mono text-xs">{payload.business.subdomain as string}.reservezy.com</span>
        </p>
        <Link href="/dashboard" className="text-xs font-semibold text-rz-accent hover:text-rz-accent-light">
          Jump to dashboard →
        </Link>
      </div>

      <StepRail />

      {renderPanel()}
    </div>
  );
}
