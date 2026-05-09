import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

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

  if (session.user.role === "SUPER_ADMIN") {
    redirect("/platform-admin");
  }

  if (session.user.role === "STAFF") {
    redirect("/dashboard");
  }

  if (
    session.user.role !== "BUSINESS_OWNER" ||
    typeof session.user.ownerId !== "string"
  ) {
    redirect("/signup");
  }

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.ownerId },
    select: {
      id: true,
      onboardingComplete: true,
      name: true,
    },
  });

  if (!business) {
    redirect("/signup");
  }

  if (business.onboardingComplete) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10">
      <Suspense fallback={null}>
        <CheckoutReturnBanner />
      </Suspense>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.4em] text-emerald-600">
          Setup · steps 3 to 8
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold text-zinc-900">
            Calibrate Reservezy · {business.name}
          </h1>
          <Link
            href="/dashboard"
            className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-700 underline-offset-2 hover:bg-zinc-200"
          >
            Dashboard shortcut
          </Link>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="text-sm font-medium text-zinc-500">
            Loading wizard…
          </div>
        }
      >
        <OnboardingWizard />
      </Suspense>
    </div>
  );
}
