import { z } from "zod";

import { getReservezySession } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http/api-response";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseDismissed(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((x): x is string => typeof x === "string");
}

export async function GET(): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try {
    requireBusinessOwner(ctx);
  } catch {
    return jsonError("Forbidden.", 403);
  }

  const business = await prisma.business.findUnique({
    where: { id: ctx.businessId },
    select: {
      checklistDismissedIds: true,
      onboardingComplete: true,
      stripeSubscriptionId: true,
      stripeCustomerId: true,
      subdomain: true,
      _count: {
        select: {
          services: true,
          staffMembers: true,
          workingHours: true,
        },
      },
    },
  });

  if (!business) {
    return jsonError("Not found.", 404);
  }

  const dismissed = parseDismissed(business.checklistDismissedIds);

  const hasStripe =
    Boolean(business.stripeCustomerId) ||
    Boolean(business.stripeSubscriptionId);
  const hasServices = business._count.services > 0;
  const hasTeam = business._count.staffMembers > 0;
  const hasHours = business._count.workingHours > 0;

  const steps = [
    {
      id: "profile",
      label: "Finish onboarding",
      done: business.onboardingComplete,
    },
    {
      id: "stripe",
      label: "Connect billing / Stripe",
      done: hasStripe,
    },
    {
      id: "services",
      label: "Add at least one service",
      done: hasServices,
    },
    {
      id: "hours",
      label: "Set working hours",
      done: hasHours,
    },
    {
      id: "team",
      label: "Invite your team (optional)",
      done: hasTeam,
    },
    {
      id: "share",
      label: "Share your booking link",
      done: dismissed.includes("share"),
    },
  ];

  return jsonOk({
    steps: steps.map((s) => ({
      ...s,
      dismissed: dismissed.includes(s.id),
    })),
    dismissedIds: dismissed,
  });
}

const patchSchema = z.object({
  dismissId: z.string().trim().min(1).max(64),
});

export async function PATCH(request: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try {
    requireBusinessOwner(ctx);
  } catch {
    return jsonError("Forbidden.", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON.", 400);
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed.", 422, parsed.error.flatten().fieldErrors);
  }

  const business = await prisma.business.findUnique({
    where: { id: ctx.businessId },
    select: { checklistDismissedIds: true },
  });
  if (!business) {
    return jsonError("Not found.", 404);
  }

  const current = parseDismissed(business.checklistDismissedIds);
  if (!current.includes(parsed.data.dismissId)) {
    current.push(parsed.data.dismissId);
  }

  await prisma.business.update({
    where: { id: ctx.businessId },
    data: { checklistDismissedIds: current },
  });

  return jsonOk({ dismissedIds: current });
}
