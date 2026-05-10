"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type TemplateRow = {
  slug: string;
  displayName: string;
  description?: string | null;
};

type PendingSignup = {
  businessName: string;
  subdomain: string;
  industrySlug: string | null;
  ts: number;
};

const PENDING_SIGNUP_KEY = "rz_oauth_pending_signup";
const MAX_PENDING_AGE_MS = 60 * 60 * 1000; // 1 hour

function readPending(): PendingSignup | null {
  try {
    const raw = localStorage.getItem(PENDING_SIGNUP_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PendingSignup;
    if (Date.now() - data.ts > MAX_PENDING_AGE_MS) {
      localStorage.removeItem(PENDING_SIGNUP_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function OAuthCompleteWizard() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [scratchLabel, setScratchLabel] = useState("Start from scratch");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [industrySlug, setIndustrySlug] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [subdomain, setSubdomain] = useState("");

  // Pre-fill from localStorage if present
  useEffect(() => {
    const pending = readPending();
    if (pending) {
      setBusinessName(pending.businessName);
      setSubdomain(pending.subdomain);
      setIndustrySlug(pending.industrySlug ?? "");
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/industry-templates");
        if (!res.ok) return;
        const body = (await res.json()) as { scratchModeLabel?: string; templates: TemplateRow[] };
        setTemplates(body.templates);
        if (body.scratchModeLabel) setScratchLabel(body.scratchModeLabel);
      } catch {
        // non-critical
      }
    };
    load().catch(() => null);
  }, []);

  const submit = async () => {
    setFormError(null);

    if (!businessName.trim() || businessName.trim().length < 2) {
      setFormError("Please enter your business name (at least 2 characters).");
      return;
    }
    if (!subdomain.trim() || subdomain.trim().length < 3) {
      setFormError("Choose a booking address — letters, numbers, hyphens (at least 3 characters).");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        businessName: businessName.trim(),
        subdomain: subdomain.trim().toLowerCase(),
      };
      if (industrySlug.trim()) payload.industrySlug = industrySlug.trim().toLowerCase();

      const res = await fetch("/api/register/oauth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body: unknown = await res.json();

      if (!res.ok) {
        const msg =
          body && typeof body === "object"
            ? ((body as { error?: string }).error ?? "Something went wrong.")
            : "Unexpected error.";
        setFormError(msg);
        setIsSubmitting(false);
        return;
      }

      try { localStorage.removeItem(PENDING_SIGNUP_KEY); } catch { /* ignore */ }

      router.push("/onboarding");
      router.refresh();
    } catch {
      setFormError("Something went wrong — please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rz-glow-soft mx-auto flex w-full max-w-xl flex-col gap-7 rounded-3xl border border-[#8b86f9]/18 bg-[#13132c]/95 px-8 py-10 shadow-2xl shadow-black/50 backdrop-blur-md">
      <div className="space-y-1.5 text-center">
        <h2 className="text-xl font-extrabold text-white">Set up your booking page</h2>
        <p className="text-sm text-rz-muted">
          Just a few details to get your personalised booking page ready.
        </p>
      </div>

      {formError && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {formError}
        </div>
      )}

      <div className="space-y-4">
        <label className="block space-y-1.5 text-sm">
          <span className="font-semibold text-rz-muted">What type of business?</span>
          <select
            value={industrySlug}
            onChange={(e) => setIndustrySlug(e.target.value)}
            className="rz-field"
            disabled={isSubmitting}
          >
            <option value="">{scratchLabel}</option>
            {templates.map((t) => (
              <option key={t.slug} value={t.slug}>{t.displayName}</option>
            ))}
          </select>
          <span className="text-xs text-rz-subtle">
            We&apos;ll pre-fill your services — you can change everything later.
          </span>
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="font-semibold text-rz-muted">Business name</span>
          <input
            className="rz-field"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Meridian Hair Studio"
            disabled={isSubmitting}
          />
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="font-semibold text-rz-muted">Your booking address</span>
          <div
            className="flex items-center gap-0 overflow-hidden rounded-xl border bg-[#0d0d23]/80 focus-within:border-rz-accent focus-within:ring-2 focus-within:ring-rz-accent/20"
            style={{ borderColor: "rgba(139,134,249,0.2)" }}
          >
            <span className="select-none border-r border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs text-rz-subtle">
              https://
            </span>
            <input
              className="flex-1 border-none bg-transparent px-3 py-2.5 text-sm text-rz-text outline-none placeholder:text-rz-subtle"
              value={subdomain}
              onChange={(e) =>
                setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              placeholder="studio-name"
              disabled={isSubmitting}
            />
            <span className="select-none border-l border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs text-rz-subtle">
              .reservezy.com
            </span>
          </div>
          <span className="text-xs text-rz-subtle">Letters, numbers, and hyphens only.</span>
        </label>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={submit}
          className="rz-btn-primary mt-2 w-full py-3 text-base disabled:opacity-60"
        >
          {isSubmitting ? "Setting up…" : "Create my booking page →"}
        </button>
      </div>
    </div>
  );
}
