import { TenantBookingApp } from "@/components/tenant/tenant-booking-app";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

type TenantPageProps = {
  params: { subdomain: string };
};

export default async function TenantBookingHomePage({ params }: TenantPageProps) {
  const subdomain = params.subdomain.trim().toLowerCase();

  const business = await prisma.business.findFirst({
    where: {
      subdomain,
      isDisabled: false,
      onboardingComplete: true,
    },
    select: {
      id: true,
      name: true,
      subscriptionStatus: true,
    },
  });

  if (!business) {
    notFound();
  }

  const isActive =
    business.subscriptionStatus === "ACTIVE" ||
    business.subscriptionStatus === "TRIALING";

  if (!isActive) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#05050a] px-6 text-center">
        <div className="mx-auto w-full max-w-md space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b86f9] to-[#6d66f0] shadow-[0_0_32px_rgba(139,134,249,0.35)]">
            <svg viewBox="0 0 24 24" fill="none" width="22" height="22" stroke="currentColor" strokeWidth="2" className="text-white">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">{business.name}</h1>
            <p className="mt-2 text-sm text-slate-400">
              Online booking for this business is coming soon.
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-6 py-5 text-sm text-slate-400">
            The booking page is not yet active. If you own this business,{" "}
            <a href="/dashboard/subscription" className="font-semibold text-[#8b86f9] hover:text-[#a89af9]">
              activate your subscription
            </a>{" "}
            to go live.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="slot-radial-hero min-h-screen bg-[#05050a] px-4 py-12 text-slate-200">
      <TenantBookingApp subdomain={subdomain} />
    </div>
  );
}
