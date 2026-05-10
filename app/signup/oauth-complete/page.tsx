import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MarketingNav } from "@/components/marketing/marketing-nav";
import { OAuthCompleteWizard } from "@/components/signup/oauth-complete-wizard";
import { getReservezySession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Finish setting up — Reservezy",
};

export default async function OAuthCompletePage() {
  const session = await getReservezySession();

  if (!session?.user) redirect("/login");
  if (session.user.role === "SUPER_ADMIN") redirect("/platform-admin");
  if (session.user.role === "STAFF") redirect("/dashboard");

  // Already has a fully set-up business — go straight to dashboard/onboarding
  if (session.user.businessId) {
    const business = await prisma.business.findUnique({
      where: { id: session.user.businessId },
      select: { onboardingComplete: true },
    });
    if (business?.onboardingComplete) redirect("/dashboard");
    redirect("/onboarding");
  }

  return (
    <div className="rz-radial-hero min-h-screen">
      <MarketingNav variant="minimal" />
      <div className="px-5 pb-16 pt-8 sm:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold text-white">Almost there!</h1>
          <p className="mt-1.5 text-sm text-rz-muted">
            Tell us about your business to finish setting up your booking page.
          </p>
        </div>
        <OAuthCompleteWizard />
      </div>
    </div>
  );
}
