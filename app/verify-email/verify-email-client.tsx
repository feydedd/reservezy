"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) { setStatus("error"); return; }
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((r) => { setStatus(r.ok ? "success" : "error"); })
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-rz-bg px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="rz-glow-soft rounded-3xl border border-[#8b86f9]/18 bg-[#13132c]/95 p-8 shadow-2xl text-center">
          <div className="mb-6 mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8b86f9]/15 text-xl font-black text-[#a5a0ff]">R</div>

          {status === "loading" && (
            <>
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[#8b86f9]" />
              <p className="mt-3 text-sm text-rz-muted">Verifying your email…</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="text-3xl">✓</div>
              <h1 className="mt-3 text-xl font-bold text-white">Email verified!</h1>
              <p className="mt-2 text-sm text-rz-muted">Your account is now active. Sign in to set up your booking page.</p>
              <Link href="/login" className="rz-btn-primary mx-auto mt-6 w-full justify-center">Sign in →</Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="text-3xl">✕</div>
              <h1 className="mt-3 text-xl font-bold text-white">Link expired or invalid</h1>
              <p className="mt-2 text-sm text-rz-muted">This verification link has already been used or has expired.</p>
              <Link href="/login" className="rz-btn-ghost mx-auto mt-6 justify-center">Back to sign in</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
