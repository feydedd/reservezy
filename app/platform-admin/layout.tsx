import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getReservezySession } from "@/lib/auth/session";
import { SignOutButton } from "@/components/sign-out-button";

export default async function PlatformAdminLayout({ children }: { children: ReactNode }) {
  const session = await getReservezySession();

  if (!session?.user?.role || session.user.role !== "SUPER_ADMIN") {
    redirect("/login?callbackUrl=/platform-admin");
  }

  return (
    <div className="min-h-screen bg-rz-bg text-rz-text">
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#080818]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#8b86f9] to-[#6d66f0] text-sm font-extrabold text-white shadow-[0_0_16px_rgba(139,134,249,0.4)]">
              R
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#a5a0ff]">Super admin</p>
              <Link href="/platform-admin" className="text-sm font-semibold text-white hover:text-rz-accent-light transition">
                Control panel
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-rz-subtle sm:block">{session.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
