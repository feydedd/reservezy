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
    select: { id: true },
  });

  if (!business) {
    notFound();
  }

  return (
    <div className="slot-radial-hero min-h-screen bg-[#05050a] px-4 py-12 text-slate-200">
      <TenantBookingApp subdomain={subdomain} />
    </div>
  );
}
