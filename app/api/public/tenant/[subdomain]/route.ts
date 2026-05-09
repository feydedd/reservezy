import { NextResponse } from "next/server";

import { hasPremiumFeatures } from "@/lib/subscription/tiers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteParams = { params: { subdomain: string } };

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const subdomain = params.subdomain.trim().toLowerCase();

  const business = await prisma.business.findFirst({
    where: {
      subdomain,
      isDisabled: false,
      onboardingComplete: true,
    },
    include: {
      branding: true,
      services: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
      staffMembers: {
        where: { isActive: true },
        include: {
          offeredServices: { select: { id: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const premium = hasPremiumFeatures(business.subscriptionTier);

  return NextResponse.json({
    business: {
      name: business.name,
      subdomain: business.subdomain,
      timezone: business.timezone,
      slotMode: business.slotMode,
      allowCustomerStaffSelection: business.allowCustomerStaffSelection,
      allowCustomerCancelReschedule: business.allowCustomerCancelReschedule,
    },
    branding: premium
      ? {
          logoUrl: business.branding?.logoUrl ?? null,
          primaryColour: business.branding?.primaryColour ?? null,
          secondaryColour: business.branding?.secondaryColour ?? null,
          googleFontFamily: business.branding?.googleFontFamily ?? null,
        }
      : {
          logoUrl: null,
          primaryColour: null,
          secondaryColour: null,
          googleFontFamily: null,
        },
    services: business.services.map((svc) => ({
      id: svc.id,
      name: svc.name,
      description: svc.description,
      durationMinutes: svc.durationMinutes,
      pricePence: svc.pricePence,
    })),
    staff: business.staffMembers.map((member) => ({
      id: member.id,
      fullName: member.fullName,
      offeredServiceIds: member.offeredServices.map((s) => s.id),
    })),
  });
}
