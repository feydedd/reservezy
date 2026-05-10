import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { SignOutButton } from "@/components/sign-out-button";
import { PlanGrantToast } from "@/components/dashboard/plan-grant-toast";
import { getReservezySession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getReservezySession();

  if (!session?.user?.id || !session.user.role) {
    redirect("/login?callbackUrl=/dashboard");
  }

  if (session.user.role === "SUPER_ADMIN") {
    redirect("/platform-admin");
  }

  let adminGrantNote: string | null = null;

  if (session.user.role === "BUSINESS_OWNER" && typeof session.user.ownerId === "string") {
    const business = await prisma.business.findUnique({
      where: { ownerId: session.user.ownerId },
      select: { onboardingComplete: true, adminGrantNote: true },
    });
    if (business && business.onboardingComplete === false) {
      redirect("/onboarding");
    }
    adminGrantNote = business?.adminGrantNote ?? null;
  }

  const ctx = await loadDashboardBusinessContext(session);
  if (!ctx) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const roleLabel = ctx.role === "BUSINESS_OWNER" ? "Owner" : "Staff";

  return (
    <div className="rz-radial-section min-h-screen">
      <div className="mx-auto flex max-w-[1280px] flex-col md:flex-row">
        <DashboardSidebar ctx={ctx} />

        <div className="flex min-h-screen flex-1 flex-col">
          {/* Top header */}
          <header className="border-b border-white/[0.07] bg-[#080818]/90 px-6 py-4 backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Link href="/" className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#8b86f9] to-[#6d66f0]">
                    <span className="text-xs font-extrabold text-white">R</span>
                  </div>
                </Link>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {ctx.businessName}
                  </p>
                  <p className="text-[11px] text-rz-subtle">{roleLabel} dashboard</p>
                </div>
              </div>
              <SignOutButton />
            </div>
          </header>

          <main className="flex-1 px-6 py-10 animate-fade-in">{children}</main>
        </div>
      </div>

      {adminGrantNote && <PlanGrantToast note={adminGrantNote} />}
    </div>
  );
}
