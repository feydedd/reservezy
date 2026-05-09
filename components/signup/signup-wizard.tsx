"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";

type TemplateRow = {
  slug: string;
  displayName: string;
  description?: string | null;
};

export function SignupWizard() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [scratchLabel, setScratchLabel] = useState("Start from scratch");
  const [step, setStep] = useState<1 | 2>(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [industrySlug, setIndustrySlug] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/industry-templates");
        if (!res.ok) { setLoadError("Couldn't load industry presets."); return; }
        const body = (await res.json()) as { scratchModeLabel?: string; templates: TemplateRow[] };
        setTemplates(body.templates);
        if (body.scratchModeLabel) setScratchLabel(body.scratchModeLabel);
      } catch {
        setLoadError("Unable to fetch templates.");
      }
    };
    load().catch(() => null);
  }, []);

  const goNextStep = () => {
    setFormError(null);
    if (!businessName.trim() || businessName.trim().length < 2) {
      setFormError("Please enter your business name (at least 2 characters).");
      return;
    }
    if (!subdomain.trim() || subdomain.trim().length < 3) {
      setFormError("Choose a short booking address — letters, numbers, hyphens (at least 3).");
      return;
    }
    setStep(2);
  };

  const submit = async () => {
    setFormError(null);
    setIsSubmitting(true);
    try {
      if (password.length < 8) {
        setFormError("Password must be at least 8 characters.");
        setIsSubmitting(false);
        return;
      }
      if (password !== passwordConfirm) {
        setFormError("The passwords don't match — please check and try again.");
        setIsSubmitting(false);
        return;
      }

      const payload: Record<string, unknown> = {
        businessName: businessName.trim(),
        subdomain: subdomain.trim().toLowerCase(),
        ownerFullName: ownerFullName.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
        ownerPassword: password,
      };
      if (industrySlug.trim()) payload.industrySlug = industrySlug.trim().toLowerCase();

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const bodyUnknown: unknown = await res.json();

      if (!res.ok) {
        const msg =
          bodyUnknown && typeof bodyUnknown === "object"
            ? ((bodyUnknown as { error?: string }).error ?? "Registration rejected.")
            : "Unexpected response from signup.";
        setFormError(msg);
        setIsSubmitting(false);
        return;
      }

      const signInRes = await signIn("credentials", {
        redirect: false,
        email: ownerEmail.trim().toLowerCase(),
        password,
      });

      if (signInRes?.error) {
        setFormError("Account created — please sign in with your new password.");
        setIsSubmitting(false);
        router.push("/login?callbackUrl=/onboarding");
        return;
      }

      router.push("/onboarding");
      router.refresh();
    } catch {
      setFormError("Something went wrong — please try again.");
      setIsSubmitting(false);
    }
  };

  /* Step indicator */
  const StepDots = () => (
    <div className="flex items-center justify-center gap-2">
      {[1, 2].map((s) => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all ${
            s === step
              ? "w-8 bg-rz-accent"
              : s < step
              ? "w-4 bg-rz-accent/50"
              : "w-4 bg-white/[0.12]"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="rz-glow-soft mx-auto flex w-full max-w-xl flex-col gap-7 rounded-3xl border border-[#8b86f9]/18 bg-[#13132c]/95 px-8 py-10 shadow-2xl shadow-black/50 backdrop-blur-md">
      {/* Header */}
      <div className="space-y-3 text-center">
        <StepDots />
        <h2 className="text-xl font-extrabold text-white">
          {step === 1 ? "Tell us about your business" : "Create your login"}
        </h2>
        <p className="text-sm text-rz-muted">
          {step === 1
            ? "This sets up your personalised booking page."
            : "You&apos;ll use these details to manage your bookings."}
        </p>
      </div>

      {/* Errors */}
      {loadError && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {loadError}
        </div>
      )}
      {formError && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {formError}
        </div>
      )}

      {step === 1 ? (
        <div className="space-y-4">
          <label className="block space-y-1.5 text-sm">
            <span className="font-semibold text-rz-muted">What type of business?</span>
            <select
              value={industrySlug}
              onChange={(e) => setIndustrySlug(e.target.value)}
              className="rz-field"
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
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-semibold text-rz-muted">Your booking address</span>
            <div className="flex items-center gap-0 overflow-hidden rounded-xl border bg-[#0d0d23]/80 focus-within:border-rz-accent focus-within:ring-2 focus-within:ring-rz-accent/20" style={{ borderColor: "rgba(139,134,249,0.2)" }}>
              <span className="select-none border-r border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs text-rz-subtle">
                https://
              </span>
              <input
                className="flex-1 border-none bg-transparent px-3 py-2.5 text-sm text-rz-text outline-none placeholder:text-rz-subtle"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="studio-name"
              />
              <span className="select-none border-l border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs text-rz-subtle">
                .reservezy.com
              </span>
            </div>
            <span className="text-xs text-rz-subtle">Letters, numbers, and hyphens only.</span>
          </label>

          <button
            type="button"
            disabled={Boolean(loadError)}
            onClick={goNextStep}
            className="rz-btn-primary mt-2 w-full py-3 text-base disabled:opacity-50"
          >
            Continue →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block space-y-1.5 text-sm">
            <span className="font-semibold text-rz-muted">Your full name</span>
            <input
              className="rz-field"
              value={ownerFullName}
              onChange={(e) => setOwnerFullName(e.target.value)}
              placeholder="Jane Smith"
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-semibold text-rz-muted">Email address</span>
            <input
              type="email"
              className="rz-field"
              value={ownerEmail}
              autoComplete="email"
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="hello@yourbusiness.com"
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-semibold text-rz-muted">Password</span>
            <input
              type="password"
              className="rz-field"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-semibold text-rz-muted">Confirm password</span>
            <input
              type="password"
              className="rz-field"
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="Same password again"
            />
          </label>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rz-btn-ghost flex-1 py-3"
              disabled={isSubmitting}
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={submit}
              className="rz-btn-primary flex-1 py-3 disabled:opacity-60"
            >
              {isSubmitting ? "Creating…" : "Create account"}
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-sm text-rz-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-rz-accent transition hover:text-rz-accent-light">
          Sign in →
        </Link>
      </p>
    </div>
  );
}
