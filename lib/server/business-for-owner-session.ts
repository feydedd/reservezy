import type { Prisma } from "@prisma/client";
import type { Session } from "next-auth";

import { prisma } from "@/lib/prisma";

const ownerRelations = {
  owner: {
    select: {
      email: true,
      fullName: true,
    },
  },
  branding: true,
  services: { orderBy: { sortOrder: "asc" as const } },
  staffMembers: {
    include: {
      offeredServices: { select: { id: true } },
      workingHours: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
  workingHours: { where: { staffMemberId: null } },
  holidays: { orderBy: { dateStart: "asc" as const } },
  subscriptions: true,
} satisfies Prisma.BusinessInclude;

export type OwnerBusinessLoaded = Prisma.BusinessGetPayload<{
  include: typeof ownerRelations;
}>;

export async function loadBusinessForOwnerSession(
  session: Session | null,
): Promise<OwnerBusinessLoaded | null> {
  if (!session?.user) {
    return null;
  }
  if (session.user.role !== "BUSINESS_OWNER" || !session.user.ownerId) {
    return null;
  }

  const businessRecord = await prisma.business.findUnique({
    where: { ownerId: session.user.ownerId },
    include: ownerRelations,
  });

  return businessRecord;
}
