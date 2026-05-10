import { Suspense } from "react";
import { redirect } from "next/navigation";

import {
  CheckoutReturnBanner,
  OnboardingWizard,
} from "@/components/onboarding/onboarding-wizard";
import { getReservezySession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function OnboardingPage() {
  const session = await getReservezySession();

  if (!session?.user?.id || !session.user.role) {
    redirect("/login?callbackUrl=/onboarding");
  }

  if (session.user.role === "SUPER_ADMIN") redirect("/platform-admin");
  if (session.user.role === "STAFF") redirect("/dashboard");

  if (
    session.user.role !== "BUSINESS_OWNER" ||
    typeof session.user.ownerId !== "string"
  ) {
    redirect("/signup");
  }

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.ownerId },
    select: { id: true, onboardingComplete: true, name: true },
  });

  if (!business) redirect("/signup");
  if (business.onboardingComplete) redirect("/dashboard");

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <Suspense fallback={null}>
        <CheckoutReturnBanner />
      </Suspense>

      {/* Page header */}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-rz-accent/70">
          Setup — steps 3 to 8
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-white">
            Set up{" "}
            <span className="text-rz-accent">{business.name}</span>
          </h1>
        </div>
        <p className="text-sm text-rz-muted">
          Complete each step to launch your booking page. You can always update these settings later from your dashboard.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="rounded-2xl border border-white/[0.07] bg-[#13132c]/80 p-10 text-center text-sm text-rz-muted">
            Loading…
          </div>
        }
      >
        <OnboardingWizard />
      </Suspense>
    </div>
  );
}
