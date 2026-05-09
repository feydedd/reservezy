"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Something went wrong");
      }
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-rz-bg px-4 py-16">
      <div className="w-full max-w-sm">
        <Link href="/login" className="rz-badge mb-8 inline-flex">← Back to sign in</Link>

        <div className="rz-glow-soft rounded-3xl border border-[#8b86f9]/18 bg-[#13132c]/95 p-8 shadow-2xl">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8b86f9]/15 text-xl font-black text-[#a5a0ff]">R</div>

          {sent ? (
            <div>
              <h1 className="text-xl font-bold text-white">Check your inbox</h1>
              <p className="mt-2 text-sm text-rz-muted">
                If an account exists for <strong className="text-white">{email}</strong>, we&apos;ve sent a password reset link. It expires in 1 hour.
              </p>
              <Link href="/login" className="rz-btn-primary mt-6 w-full justify-center">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-white">Forgot your password?</h1>
              <p className="mt-1 text-sm text-rz-muted">No worries — we&apos;ll email you a reset link.</p>

              {error && (
                <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
              )}

              <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-rz-muted">Email address</label>
                  <input
                    type="email"
                    required
                    className="rz-field"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                  />
                </div>
                <button type="submit" disabled={loading} className="rz-btn-primary w-full justify-center disabled:opacity-60">
                  {loading ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : "Send reset link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
