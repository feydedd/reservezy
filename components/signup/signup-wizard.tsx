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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

const PENDING_SIGNUP_KEY = "rz_oauth_pending_signup";

export function SignupWizard() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [scratchLabel, setScratchLabel] = useState("Start from scratch");
  const [step, setStep] = useState<1 | 2>(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);

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

  const savePendingSignup = () => {
    try {
      localStorage.setItem(
        PENDING_SIGNUP_KEY,
        JSON.stringify({
          businessName: businessName.trim(),
          subdomain: subdomain.trim().toLowerCase(),
          industrySlug: industrySlug.trim().toLowerCase() || null,
          ts: Date.now(),
        }),
      );
    } catch {
      // localStorage unavailable — proceed anyway; user will be prompted on next page
    }
  };

  const handleOAuthSignup = (provider: "google" | "apple") => {
    setFormError(null);
    if (!businessName.trim() || businessName.trim().length < 2) {
      setFormError("Please go back and fill in your business name.");
      return;
    }
    if (!subdomain.trim() || subdomain.trim().length < 3) {
      setFormError("Please go back and fill in your booking address.");
      return;
    }
    savePendingSignup();
    setOauthLoading(provider);
    void signIn(provider, { callbackUrl: "/signup/oauth-complete" });
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
            : "You'll use these details to manage your bookings."}
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
          {/* OAuth sign-up */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleOAuthSignup("google")}
              disabled={isSubmitting || oauthLoading !== null}
              className="flex flex-1 items-center justify-center gap-2.5 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-rz-text transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {oauthLoading === "google" ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <GoogleIcon />
              )}
              Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuthSignup("apple")}
              disabled={isSubmitting || oauthLoading !== null}
              className="flex flex-1 items-center justify-center gap-2.5 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-rz-text transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {oauthLoading === "apple" ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <AppleIcon />
              )}
              Apple
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.08]" />
            <span className="text-xs text-rz-subtle">or create with email</span>
            <div className="h-px flex-1 bg-white/[0.08]" />
          </div>

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
              disabled={isSubmitting || oauthLoading !== null}
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={isSubmitting || oauthLoading !== null}
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
