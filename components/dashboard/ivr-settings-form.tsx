"use client";

import { useState, useEffect, useCallback } from "react";
import { Phone, Copy, CheckCircle, ExternalLink, MessageSquare } from "lucide-react";

type IvrData = {
  subdomain: string;
  ivrEnabled: boolean;
  ivrForwardNumber: string | null;
};

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
            on
              ? "border-[#8b86f9]/60 bg-[#8b86f9]/30"
              : "border-white/10 bg-white/[0.08]"
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
        {description && (
          <p className="mt-0.5 text-sm text-rz-muted">{description}</p>
        )}
      </div>
    </label>
  );
}

function CopyBox({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-rz-muted">
        {label}
      </p>
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

export default function IvrSettingsForm() {
  const [data, setData] = useState<IvrData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [forwardNumber, setForwardNumber] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard/ivr");
    const json = await res.json();
    const d: IvrData = json.data ?? json;
    setData(d);
    setForwardNumber(d.ivrForwardNumber ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!data) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/dashboard/ivr", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ivrEnabled: data.ivrEnabled,
          ivrForwardNumber: forwardNumber.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to save.");
      } else {
        const d: IvrData = json.data ?? json;
        setData(d);
        setForwardNumber(d.ivrForwardNumber ?? "");
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  const base = typeof window !== "undefined"
    ? window.location.origin
    : "https://reservezy.com";

  const webhookUrl = data
    ? `${base}/api/public/ivr/${data.subdomain}/voice`
    : "";

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#8b86f9] border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="p-6 text-rz-muted">Could not load IVR settings.</p>
    );
  }

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
            Set up an automated phone menu so callers can request your booking
            link by text or be connected directly to your team.
          </p>
        </div>
      </div>

      {/* How it works */}
      <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">How it works</h2>
        <ol className="space-y-2 text-sm text-rz-muted list-decimal list-inside">
          <li>
            Get a Twilio phone number at{" "}
            <a
              href="https://www.twilio.com/en-us/phone-numbers"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#a5a0ff] hover:underline"
            >
              twilio.com <ExternalLink size={11} />
            </a>{" "}
            (~$1.15/month). Your customers call this number.
          </li>
          <li>
            In Twilio, point that number&apos;s <strong className="text-white">Voice webhook</strong> at
            the URL below (HTTP POST).
          </li>
          <li>
            Enter your real business phone number below as the
            <strong className="text-white"> forwarding number</strong> for callers
            who press 2.
          </li>
          <li>
            Enable IVR and save. Your callers will now hear:{" "}
            <em className="text-white/70">
              &ldquo;Press 1 for a booking link by text. Press 2 to speak with
              us.&rdquo;
            </em>
          </li>
        </ol>

        <div className="mt-4 flex items-start gap-3 rounded-lg border border-[#8b86f9]/20 bg-[#8b86f9]/5 px-4 py-3">
          <MessageSquare size={16} className="mt-0.5 shrink-0 text-[#a5a0ff]" />
          <p className="text-xs text-rz-muted">
            When a caller presses 1, Reservezy automatically texts them your
            booking link using your Twilio number — no extra setup needed.
          </p>
        </div>
      </section>

      {/* Webhook URL */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Your webhook URL</h2>
        <p className="text-xs text-rz-muted">
          Paste this into Twilio under your phone number → Voice → &ldquo;A
          call comes in&rdquo; → Webhook (HTTP POST).
        </p>
        {webhookUrl && <CopyBox value={webhookUrl} label="Twilio voice webhook" />}
      </section>

      {/* Settings form */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white">Settings</h2>

        <Toggle
          on={data.ivrEnabled}
          onChange={(v) => setData({ ...data, ivrEnabled: v })}
          label="Enable phone IVR"
          description="Activate the menu when someone calls your Twilio number."
        />

        <div>
          <label
            htmlFor="forwardNumber"
            className="mb-1.5 block text-sm font-medium text-rz-muted"
          >
            Forwarding number{" "}
            <span className="text-rz-muted/60">(E.164 format, e.g. +447911123456)</span>
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
            Callers who press 2 will be connected to this number. If left
            blank, they&apos;ll hear an apology message.
          </p>
        </div>
      </section>

      {/* Call flow preview */}
      <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">Call flow preview</h2>
        <div className="space-y-2 text-sm">
          {[
            {
              icon: "📞",
              step: "Customer calls your Twilio number",
            },
            {
              icon: "🤖",
              step: `"Thank you for calling ${data.subdomain}. Press 1 to receive our booking link by text. Press 2 to speak with us."`,
              muted: true,
            },
            {
              icon: "1️⃣",
              step: "Press 1 → SMS sent with booking link → call ends",
            },
            {
              icon: "2️⃣",
              step: `Press 2 → connected to ${forwardNumber || "your number"}`,
            },
            {
              icon: "⏱️",
              step: `No response after 10 s → ${forwardNumber ? `connected to ${forwardNumber}` : "apology message"}`,
            },
          ].map(({ icon, step, muted }) => (
            <div key={step} className="flex items-start gap-3">
              <span className="text-base leading-snug">{icon}</span>
              <p className={muted ? "italic text-rz-muted" : "text-white/80"}>
                {step}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Actions */}
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
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
