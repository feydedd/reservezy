import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getReservezySession } from "@/lib/auth/session";

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const session = await getReservezySession();

  if (!session?.user?.id || !session.user.role) {
    redirect("/login?callbackUrl=/onboarding");
  }

  if (session.user.role === "SUPER_ADMIN") redirect("/platform-admin");
  if (session.user.role === "STAFF") redirect("/dashboard");

  return (
    <div className="rz-radial-hero min-h-screen">
      <header className="border-b border-white/[0.06] bg-[#080818]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#8b86f9] to-[#6d66f0]">
              <span className="text-xs font-extrabold text-white">R</span>
            </div>
            <span className="text-sm font-bold text-white">Reservezy</span>
          </Link>
          <span className="rounded-full border border-[#8b86f9]/20 bg-[#8b86f9]/10 px-3 py-1 text-xs font-semibold text-rz-accent">
            Setting up your account
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 pb-20">
        {children}
      </main>
    </div>
  );
}
