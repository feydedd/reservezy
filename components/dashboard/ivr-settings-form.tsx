"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Phone,
  Copy,
  CheckCircle,
  Sparkles,
  Star,
  Trash2,
  Loader2,
  MessageSquare,
} from "lucide-react";

type IvrData = {
  subdomain: string;
  ivrEnabled: boolean;
  ivrForwardNumber: string | null;
  ivrManagedEnabled: boolean;
  ivrPhoneNumber: string | null;
  ivrAddOnSubscriptionId: string | null;
  subscriptionTier: "BASIC" | "STANDARD" | "PREMIUM";
};

const COUNTRY_OPTIONS = [
  { code: "GB", label: "United Kingdom (+44)" },
  { code: "US", label: "United States (+1)" },
  { code: "AU", label: "Australia (+61)" },
  { code: "IE", label: "Ireland (+353)" },
  { code: "CA", label: "Canada (+1)" },
  { code: "NZ", label: "New Zealand (+64)" },
];

function CopyBox({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div>
      {label && (
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-rz-muted">
          {label}
        </p>
      )}
      <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5">
        <code className="flex-1 truncate text-sm text-[#a5a0ff]">{value}</code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-md p-1.5 text-rz-muted transition hover:bg-white/10 hover:text-white"
        >
          {copied ? (
            <CheckCircle size={15} className="text-green-400" />
          ) : (
            <Copy size={15} />
          )}
        </button>
      </div>
    </div>
  );
}

function Toggle({
  on,
  onChange,
  label,
  description,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 transition hover:border-white/15">
      <div className="mt-0.5 shrink-0">
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => onChange(!on)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
            on ? "border-[#8b86f9]/60 bg-[#8b86f9]/30" : "border-white/10 bg-white/[0.08]"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full transition-transform ${
              on ? "translate-x-6 bg-[#a5a0ff]" : "translate-x-1 bg-rz-subtle"
            }`}
          />
        </button>
      </div>
      <div>
        <div className="font-medium text-white">{label}</div>
        {description && <p className="mt-0.5 text-sm text-rz-muted">{description}</p>}
      </div>
    </label>
  );
}

export default function IvrSettingsForm() {
  const searchParams  = useSearchParams();
  const [data, setData] = useState<IvrData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forwardNumber, setForwardNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [provisioning, setProvisioning] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [provisionError, setProvisionError] = useState("");
  const [countryCode, setCountryCode] = useState("GB");

  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const justPaid = searchParams?.get("ivr_success") === "1";

  const load = useCallback(async () => {
    const res  = await fetch("/api/dashboard/ivr");
    const json = await res.json();
    const d: IvrData = json.data ?? json;
    setData(d);
    setForwardNumber(d.ivrForwardNumber ?? "");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const isPremium = data?.subscriptionTier === "PREMIUM";
  const hasAddon  = !!data?.ivrAddOnSubscriptionId;
  const canManage = isPremium || hasAddon;
  const isActive  = !!data?.ivrPhoneNumber;

  async function provision() {
    setProvisioning(true);
    setProvisionError("");
    const res  = await fetch("/api/dashboard/ivr/provision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countryCode }),
    });
    const json = await res.json();
    if (!res.ok) {
      setProvisionError(json.error ?? "Failed to provision number.");
    } else {
      await load();
    }
    setProvisioning(false);
  }

  async function release() {
    if (!confirm("Release this number? Callers will no longer reach your IVR.")) return;
    setReleasing(true);
    const res = await fetch("/api/dashboard/ivr/provision", { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      alert(json.error ?? "Failed to release number.");
    } else {
      await load();
    }
    setReleasing(false);
  }

  async function startCheckout() {
    setCheckingOut(true);
    setCheckoutError("");
    const res  = await fetch("/api/dashboard/ivr/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countryCode }),
    });
    const json = await res.json();
    if (!res.ok) {
      setCheckoutError(json.error ?? "Failed to start checkout.");
      setCheckingOut(false);
    } else if (json.data?.url ?? json.url) {
      window.location.href = json.data?.url ?? json.url;
    }
  }

  async function save() {
    if (!data) return;
    setSaving(true);
    setSaveError("");
    setSaved(false);
    const res  = await fetch("/api/dashboard/ivr", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ivrEnabled: data.ivrEnabled,
        ivrForwardNumber: forwardNumber.trim() || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setSaveError(json.error ?? "Failed to save.");
    } else {
      const d: IvrData = json.data ?? json;
      setData(d);
      setForwardNumber(d.ivrForwardNumber ?? "");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#8b86f9] border-t-transparent" />
      </div>
    );
  }
  if (!data) return <p className="p-6 text-rz-muted">Could not load IVR settings.</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#8b86f9]/15">
          <Phone size={22} className="text-[#a5a0ff]" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Phone IVR</h1>
          <p className="mt-1 text-sm text-rz-muted">
            Give your business a dedicated phone number with an automated menu.
            Callers press 1 to get your booking link by text, or press 2 to
            speak with your team.
          </p>
        </div>
      </div>

      {/* Success banner */}
      {justPaid && (
        <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3">
          <CheckCircle size={18} className="shrink-0 text-green-400" />
          <p className="text-sm text-green-300">
            Payment confirmed! Your phone number is being provisioned — it will
            appear below within a few seconds.
          </p>
        </div>
      )}

      {/* ── MANAGED IVR ── */}
      <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#a5a0ff]" />
            <h2 className="font-semibold text-white">Managed by Reservezy</h2>
            <span className="rounded-full bg-[#8b86f9]/15 px-2 py-0.5 text-[11px] font-semibold text-[#a5a0ff]">
              Recommended
            </span>
          </div>
          {isPremium && (
            <span className="flex items-center gap-1 rounded-full bg-yellow-400/10 px-2.5 py-0.5 text-xs font-semibold text-yellow-300">
              <Star size={11} /> Included in Premium
            </span>
          )}
        </div>

        <p className="text-sm text-rz-muted">
          We provision a real phone number for your business — no Twilio account
          or technical setup required. Customers call the number and your IVR
          menu runs automatically.
        </p>

        {/* Provisioned number */}
        {isActive ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-green-500/25 bg-green-500/[0.07] px-4 py-3">
              <CheckCircle size={18} className="shrink-0 text-green-400" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-green-400">Active number</p>
                <p className="mt-0.5 text-lg font-bold tracking-wide text-white">
                  {data.ivrPhoneNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={release}
                disabled={releasing}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:border-red-500/60 hover:bg-red-500/10 disabled:opacity-50"
              >
                {releasing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Release
              </button>
            </div>
            <p className="text-xs text-rz-muted">
              Advertise this number on your website, social media, and business
              cards. When customers call, they&apos;ll hear your booking menu.
            </p>
          </div>
        ) : canManage ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-rz-muted">
                Country for phone number
              </label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="rz-field w-full"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={provision}
              disabled={provisioning}
              className="rz-btn-primary flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50"
            >
              {provisioning ? (
                <><Loader2 size={15} className="animate-spin" /> Provisioning…</>
              ) : (
                <><Phone size={15} /> Get my number {isPremium ? "(free)" : ""}</>
              )}
            </button>
            {provisionError && (
              <p className="text-sm text-red-400">{provisionError}</p>
            )}
          </div>
        ) : (
          /* Paywall for Basic / Standard */
          <div className="rounded-xl border border-[#8b86f9]/20 bg-[#8b86f9]/[0.06] p-5 space-y-4">
            <div className="flex items-start gap-3">
              <MessageSquare size={18} className="mt-0.5 shrink-0 text-[#a5a0ff]" />
              <div>
                <p className="font-medium text-white">
                  Add managed IVR for{" "}
                  <span className="text-[#a5a0ff]">£2 / month</span>
                </p>
                <p className="mt-1 text-sm text-rz-muted">
                  We handle everything — number provisioning, call routing, and
                  SMS delivery. Cancel any time.
                  {" "}Alternatively,{" "}
                  <a
                    href="/dashboard/subscription"
                    className="text-[#a5a0ff] hover:underline"
                  >
                    upgrade to Premium
                  </a>{" "}
                  and get it included.
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-rz-muted">
                Country for phone number
              </label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="rz-field w-full"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={startCheckout}
              disabled={checkingOut}
              className="rz-btn-primary flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50"
            >
              {checkingOut ? (
                <><Loader2 size={15} className="animate-spin" /> Redirecting to checkout…</>
              ) : (
                <>Add IVR — £2/month</>
              )}
            </button>
            {checkoutError && (
              <p className="text-sm text-red-400">{checkoutError}</p>
            )}
          </div>
        )}
      </section>

      {/* ── SHARED SETTINGS ── */}
      <section className="space-y-5">
        <h2 className="text-sm font-semibold text-white">Call settings</h2>

        <Toggle
          on={data.ivrEnabled}
          onChange={(v) => setData({ ...data, ivrEnabled: v })}
          label="IVR active"
          description="When off, inbound calls bypass the menu and go straight to your forwarding number."
        />

        <div>
          <label
            htmlFor="forwardNumber"
            className="mb-1.5 block text-sm font-medium text-rz-muted"
          >
            Forwarding number{" "}
            <span className="text-rz-muted/60">(E.164, e.g. +447911123456)</span>
          </label>
          <input
            id="forwardNumber"
            type="tel"
            value={forwardNumber}
            onChange={(e) => setForwardNumber(e.target.value)}
            placeholder="+447911123456"
            className="rz-field w-full"
          />
          <p className="mt-1 text-xs text-rz-muted">
            Your real business phone. Callers who press 2, or don&apos;t
            respond, are connected here.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rz-btn-primary px-6 py-2.5 text-sm disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-400">
              <CheckCircle size={15} /> Saved
            </span>
          )}
          {saveError && <p className="text-sm text-red-400">{saveError}</p>}
        </div>
      </section>

      {/* ── SELF-HOSTED fallback ── */}
      <details className="group rounded-xl border border-white/[0.06]">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-medium text-rz-muted hover:text-white">
          <span>Using your own Twilio account?</span>
          <span className="text-xs text-rz-muted/60 group-open:hidden">Show webhook URL</span>
          <span className="hidden text-xs text-rz-muted/60 group-open:inline">Hide</span>
        </summary>
        <div className="border-t border-white/[0.06] px-5 pb-5 pt-4 space-y-3">
          <p className="text-xs text-rz-muted">
            Point your Twilio number&apos;s Voice webhook (HTTP POST) at the URL
            below. The IVR will use the same forwarding number and call flow
            configured above.
          </p>
          <CopyBox
            value={
              typeof window !== "undefined"
                ? `${window.location.origin}/api/public/ivr/${data.subdomain}/voice`
                : `https://reservezy.com/api/public/ivr/${data.subdomain}/voice`
            }
            label="Twilio voice webhook URL"
          />
        </div>
      </details>

      {/* Call flow preview */}
      <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">Call flow</h2>
        <div className="space-y-2 text-sm">
          {[
            { icon: "📞", text: `Customer calls ${data.ivrPhoneNumber ?? "your number"}` },
            {
              icon: "🤖",
              text: `"Thank you for calling. Press 1 for a booking link by text. Press 2 to speak with us."`,
              muted: true,
            },
            { icon: "1️⃣", text: "Press 1 → SMS with booking link sent → call ends" },
            {
              icon: "2️⃣",
              text: `Press 2 → connected to ${forwardNumber || "your forwarding number"}`,
            },
            {
              icon: "⏱️",
              text: `No response after 10 s → ${forwardNumber ? `connected to ${forwardNumber}` : "apology message"}`,
            },
          ].map(({ icon, text, muted }) => (
            <div key={text} className="flex items-start gap-3">
              <span className="text-base leading-snug">{icon}</span>
              <p className={muted ? "italic text-rz-muted" : "text-white/80"}>{text}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
