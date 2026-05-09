import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MarketingNav } from "@/components/marketing/marketing-nav";
import { SignupWizard } from "@/components/signup/signup-wizard";
import { getReservezySession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Get started — Reservezy",
};

export default async function SignupPage() {
  const session = await getReservezySession();

  if (session?.user.role === "SUPER_ADMIN") redirect("/platform-admin");
  if (session?.user.role === "STAFF") redirect("/dashboard");

  if (session?.user.role === "BUSINESS_OWNER" && session.user.ownerId) {
    const business = await prisma.business.findUnique({
      where: { ownerId: session.user.ownerId },
      select: { onboardingComplete: true },
    });
    if (business?.onboardingComplete) redirect("/dashboard");
    redirect("/onboarding");
  }

  return (
    <div className="rz-radial-hero min-h-screen">
      <MarketingNav variant="minimal" />
      <div className="px-5 pb-16 pt-8 sm:px-8">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-rz-muted transition hover:text-white"
          >
            ← Back to home
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-white">Create your booking page</h1>
            <p className="mt-1.5 text-sm text-rz-muted">
              Takes about 3 minutes. No technical skills needed.
            </p>
          </div>
        </div>
        <SignupWizard />
      </div>
    </div>
  );
}
