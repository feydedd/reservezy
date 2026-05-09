import type { Session } from "next-auth";

import type { SubscriptionTier } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { ReservezyRole } from "@/lib/session-role";

export type DashboardBusinessContext = {
  role: ReservezyRole;
  businessId: string;
  businessName: string;
  subdomain: string;
  timezone: string;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: string;
  slotMode: string;
  allowCustomerStaffSelection: boolean;
  ownerId: string | null;
  staffMemberId: string | null;
};

export async function loadDashboardBusinessContext(
  session: Session | null,
): Promise<DashboardBusinessContext | null> {
  if (!session?.user?.role) {
    return null;
  }

  if (session.user.role === "BUSINESS_OWNER" && session.user.ownerId) {
    const business = await prisma.business.findUnique({
      where: { ownerId: session.user.ownerId },
      select: {
        id: true,
        name: true,
        subdomain: true,
        timezone: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        slotMode: true,
        allowCustomerStaffSelection: true,
      },
    });
    if (!business) {
      return null;
    }
    return {
      role: "BUSINESS_OWNER",
      businessId: business.id,
      businessName: business.name,
      subdomain: business.subdomain,
      timezone: business.timezone,
      subscriptionTier: business.subscriptionTier,
      subscriptionStatus: business.subscriptionStatus,
      slotMode: business.slotMode,
      allowCustomerStaffSelection: business.allowCustomerStaffSelection,
      ownerId: session.user.ownerId ?? null,
      staffMemberId: null,
    };
  }

  if (session.user.role === "STAFF" && session.user.staffMemberId) {
    const staff = await prisma.staffMember.findUnique({
      where: { id: session.user.staffMemberId },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            timezone: true,
            subscriptionTier: true,
            subscriptionStatus: true,
            slotMode: true,
            allowCustomerStaffSelection: true,
          },
        },
      },
    });
    if (!staff || !staff.isActive) {
      return null;
    }
    return {
      role: "STAFF",
      businessId: staff.business.id,
      businessName: staff.business.name,
      subdomain: staff.business.subdomain,
      timezone: staff.business.timezone,
      subscriptionTier: staff.business.subscriptionTier,
      subscriptionStatus: staff.business.subscriptionStatus,
      slotMode: staff.business.slotMode,
      allowCustomerStaffSelection: staff.business.allowCustomerStaffSelection,
      ownerId: null,
      staffMemberId: staff.id,
    };
  }

  return null;
}
