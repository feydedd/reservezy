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

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CredentialsLoginInput>({
    resolver: zodResolver(credentialsLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    setIsSubmitting(true);
    try {
      const redirectTarget =
        callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
          ? callbackUrl
          : "/dashboard";

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
        <p className="text-sm text-rz-muted">
          Sign in with the email and password you used to sign up.
        </p>
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
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
          disabled={isSubmitting}
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
