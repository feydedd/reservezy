"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  type CredentialsLoginInput,
  credentialsLoginSchema,
} from "@/schemas/credentials-login";

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

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const oauthError = searchParams.get("error");

  const [formError, setFormError] = useState<string | null>(
    oauthError === "OAuthAccountNotLinked"
      ? "This Google or Apple account is already linked to a different login. Please sign in with your original method."
      : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);

  const form = useForm<CredentialsLoginInput>({
    resolver: zodResolver(credentialsLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const redirectTarget =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/dashboard";

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    setIsSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl: redirectTarget,
      });

      if (result?.error) {
        setFormError("That email or password doesn't look right — please try again.");
        setIsSubmitting(false);
        return;
      }

      router.push(result?.url ?? redirectTarget);
      router.refresh();
    } catch {
      setFormError("Something went wrong — please try again.");
      setIsSubmitting(false);
    }
  });

  const handleOAuth = (provider: "google" | "apple") => {
    setOauthLoading(provider);
    void signIn(provider, { callbackUrl: redirectTarget });
  };

  return (
    <div className="rz-glow-soft mx-auto flex w-full max-w-md flex-col gap-7 rounded-3xl border border-[#8b86f9]/18 bg-[#13132c]/95 px-8 py-10 shadow-2xl shadow-black/50 backdrop-blur-md">
      {/* Header */}
      <div className="space-y-1.5 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b86f9] to-[#6d66f0] shadow-[0_0_24px_rgba(139,134,249,0.4)]">
            <span className="text-xl font-extrabold text-white">R</span>
          </div>
        </div>
        <h1 className="text-2xl font-extrabold text-white">Welcome back</h1>
        <p className="text-sm text-rz-muted">Sign in to your Reservezy account.</p>
      </div>

      {/* OAuth buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => handleOAuth("google")}
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
          onClick={() => handleOAuth("apple")}
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
        <span className="text-xs text-rz-subtle">or sign in with email</span>
        <div className="h-px flex-1 bg-white/[0.08]" />
      </div>

      {/* Form */}
      <form className="space-y-4" noValidate onSubmit={onSubmit}>
        <label className="block space-y-1.5 text-sm">
          <span className="font-semibold text-rz-muted">Email address</span>
          <input
            type="email"
            autoComplete="email"
            className="rz-field"
            placeholder="hello@yourbusiness.com"
            disabled={isSubmitting || oauthLoading !== null}
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <span className="text-xs text-red-400">{form.formState.errors.email.message}</span>
          )}
        </label>

        <div className="block space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-rz-muted">Password</span>
            <Link href="/forgot-password" className="text-xs text-rz-subtle transition hover:text-rz-accent">
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            autoComplete="current-password"
            className="rz-field"
            placeholder="••••••••"
            disabled={isSubmitting || oauthLoading !== null}
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <span className="text-xs text-red-400">{form.formState.errors.password.message}</span>
          )}
        </div>

        {formError && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {formError}
          </div>
        )}

        <button
          type="submit"
          className="rz-btn-primary mt-2 w-full py-3 text-base disabled:opacity-60"
          disabled={isSubmitting || oauthLoading !== null}
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-rz-muted">
        New here?{" "}
        <Link href="/signup" className="font-bold text-rz-accent transition hover:text-rz-accent-light">
          Create your free account →
        </Link>
      </p>
    </div>
  );
}
