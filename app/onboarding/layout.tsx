import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getReservezySession } from "@/lib/auth/session";

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const session = await getReservezySession();

  if (!session?.user?.id || !session.user.role) {
    redirect("/login?callbackUrl=/onboarding");
  }

  if (session.user.role === "SUPER_ADMIN") {
    redirect("/platform-admin");
  }

  if (session.user.role === "STAFF") {
    redirect("/dashboard");
  }

  return (
    <div className="rz-radial-hero min-h-screen">
      {/* Header */}
      <header className="border-b border-white/[0.07] bg-[#080818]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#8b86f9] to-[#6d66f0]">
              <span className="text-xs font-extrabold text-white">R</span>
            </div>
            <span className="text-sm font-bold text-white">Reservezy</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="rz-badge text-xs">Setting up your account</span>
          </div>
        </div>
      </header>

      {/* Welcome message */}
      <div className="mx-auto max-w-5xl px-6 pb-2 pt-8">
        <p className="text-center text-sm text-rz-muted">
          You&apos;re almost there — fill in a few details and your booking page will be live.
        </p>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-6 pb-16">
        {children}
      </main>
    </div>
  );
}
