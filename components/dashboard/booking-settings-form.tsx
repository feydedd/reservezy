"use client";

import { useState, useEffect, useCallback } from "react";
import { Check } from "lucide-react";

type Settings = {
  allowCustomerStaffSelection: boolean;
  allowCustomerCancelReschedule: boolean;
  cancellationNoticeHours: number;
  bookingBufferMinutes: number;
  slotMode: "FIXED" | "FLEXIBLE";
};

function Toggle({ on, onChange, label, description }: { on: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 transition hover:border-white/15">
      <div className="mt-0.5 shrink-0">
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => onChange(!on)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${on ? "border-[#8b86f9]/60 bg-[#8b86f9]/30" : "border-white/10 bg-white/[0.08]"}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full transition-transform ${on ? "translate-x-6 bg-[#a5a0ff]" : "translate-x-1 bg-rz-subtle"}`} />
        </button>
      </div>
      <div>
        <div className="font-medium text-white">{label}</div>
        {description && <p className="mt-0.5 text-sm text-rz-muted">{description}</p>}
      </div>
    </label>
  );
}

export default function BookingSettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard/booking-settings");
    const data = await res.json();
    setSettings(data.settings);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/dashboard/booking-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSettings(data.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => s ? { ...s, [key]: value } : s);
  }

  if (loading || !settings) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-white/[0.06]" />
        {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Booking settings</h1>
        <p className="mt-1 text-sm text-rz-muted">Control how customers interact with your booking flow.</p>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-rz-subtle">Customer options</h2>

        <Toggle
          on={settings.allowCustomerStaffSelection}
          onChange={(v) => set("allowCustomerStaffSelection", v)}
          label="Let customers choose a team member"
          description="Customers will see a list of your staff and can pick who they book with."
        />

        <Toggle
          on={settings.allowCustomerCancelReschedule}
          onChange={(v) => set("allowCustomerCancelReschedule", v)}
          label="Allow customers to cancel or reschedule"
          description="A self-service link is included in every confirmation email."
        />
      </section>

      {settings.allowCustomerCancelReschedule && (
        <section className="rounded-xl border border-white/10 bg-[#11111f]/80 p-5">
          <label className="block text-sm font-medium text-rz-muted mb-1.5">
            Minimum notice for cancel / reschedule
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={168}
              className="rz-field w-28"
              value={settings.cancellationNoticeHours}
              onChange={(e) => set("cancellationNoticeHours", Number(e.target.value))}
            />
            <span className="text-sm text-rz-muted">hours before appointment</span>
          </div>
          <p className="mt-1.5 text-xs text-rz-subtle">
            Customers can&apos;t change bookings within this window. Set to 0 for no restriction.
          </p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-rz-subtle">Slot type</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["FLEXIBLE", "FIXED"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => set("slotMode", mode)}
              className={`rounded-xl border p-4 text-left transition ${settings.slotMode === mode ? "border-[#8b86f9]/50 bg-[#8b86f9]/10" : "border-white/[0.08] bg-white/[0.03] hover:border-white/15"}`}
            >
              <div className="font-semibold text-white">{mode === "FLEXIBLE" ? "Flexible" : "Fixed"}</div>
              <p className="mt-1 text-xs text-rz-muted">
                {mode === "FLEXIBLE"
                  ? "Customer picks any available time within your hours."
                  : "You define specific slots that customers book into."}
              </p>
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="rz-btn-primary gap-2 disabled:opacity-60">
          {saving ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Check className="h-4 w-4" />}
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="text-sm text-[#a5a0ff]">✓ Saved</span>}
      </div>
    </div>
  );
}
