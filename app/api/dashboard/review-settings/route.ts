import { z } from "zod";

import { getReservezySession } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http/api-response";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { prisma } from "@/lib/prisma";
import { hasPremiumFeatures } from "@/lib/subscription/tiers";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  reviewPromptEnabled: z.boolean().optional(),
  reviewUrl: z.string().trim().max(2000).optional().nullable(),
});

export async function GET(): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try {
    requireBusinessOwner(ctx);
  } catch {
    return jsonError("Forbidden.", 403);
  }

  if (!hasPremiumFeatures(ctx.subscriptionTier)) {
    return jsonError("Review prompts are a Premium feature.", 403);
  }

  const business = await prisma.business.findUnique({
    where: { id: ctx.businessId },
    select: {
      reviewPromptEnabled: true,
      reviewUrl: true,
    },
  });

  return jsonOk({ settings: business });
}

export async function PATCH(request: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try {
    requireBusinessOwner(ctx);
  } catch {
    return jsonError("Forbidden.", 403);
  }

  if (!hasPremiumFeatures(ctx.subscriptionTier)) {
    return jsonError("Review prompts are a Premium feature.", 403);
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

  if (parsed.data.reviewUrl && !parsed.data.reviewUrl.startsWith("http")) {
    return jsonError("Review URL must start with https://", 422);
  }

  const updated = await prisma.business.update({
    where: { id: ctx.businessId },
    data: {
      ...(parsed.data.reviewPromptEnabled !== undefined
        ? { reviewPromptEnabled: parsed.data.reviewPromptEnabled }
        : {}),
      ...(parsed.data.reviewUrl !== undefined
        ? { reviewUrl: parsed.data.reviewUrl }
        : {}),
    },
    select: {
      reviewPromptEnabled: true,
      reviewUrl: true,
    },
  });

  return jsonOk({ settings: updated });
}
