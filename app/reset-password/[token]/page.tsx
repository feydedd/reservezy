"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reset failed");
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
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

          {done ? (
            <div>
              <h1 className="text-xl font-bold text-white">Password updated!</h1>
              <p className="mt-2 text-sm text-rz-muted">Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-white">Set a new password</h1>
              <p className="mt-1 text-sm text-rz-muted">Choose something strong and memorable.</p>

              {error && (
                <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
              )}

              <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-rz-muted">New password</label>
                  <input type="password" required className="rz-field" placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-rz-muted">Confirm password</label>
                  <input type="password" required className="rz-field" placeholder="Same as above" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
                <button type="submit" disabled={loading} className="rz-btn-primary w-full justify-center disabled:opacity-60">
                  {loading ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : "Update password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
