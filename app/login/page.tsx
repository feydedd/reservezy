import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { MarketingNav } from "@/components/marketing/marketing-nav";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in — Reservezy",
};

function LoginSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-7 rounded-3xl border border-[#8b86f9]/15 bg-[#13132c]/90 px-8 py-10">
      <div className="flex justify-center">
        <div className="h-12 w-12 animate-pulse rounded-2xl bg-[#8b86f9]/30" />
      </div>
      <div className="space-y-3">
        <div className="h-10 animate-pulse rounded-xl bg-white/[0.06]" />
        <div className="h-10 animate-pulse rounded-xl bg-white/[0.06]" />
        <div className="h-12 animate-pulse rounded-full bg-[#8b86f9]/30" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="rz-radial-hero min-h-screen">
      <MarketingNav variant="minimal" />
      <div className="px-5 pb-16 pt-8 sm:px-8">
        <div className="mb-6 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-rz-muted transition hover:text-white"
          >
            ← Back to home
          </Link>
        </div>
        <Suspense fallback={<LoginSkeleton />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
