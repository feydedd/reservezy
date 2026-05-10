import { z } from "zod";
import { SubscriptionStatus, SubscriptionTier } from "@prisma/client";

import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getReservezySession } from "@/lib/auth/session";
import { sendPlanGrantEmail } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

const patchSchema = z.object({
  isDisabled: z.boolean().optional(),
  tier: z.nativeEnum(SubscriptionTier).optional(),
  durationDays: z.number().int().min(1).max(3650).optional(),
});

export async function PATCH(req: Request, { params }: RouteParams): Promise<Response> {
  const session = await getReservezySession();
  if (session?.user?.role !== "SUPER_ADMIN") return jsonError("Forbidden.", 403);

  let body: unknown;
  try { body = await req.json(); } catch { return jsonError("Invalid JSON.", 400); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload.", 422);

  const { isDisabled, tier, durationDays } = parsed.data;

  // Build the update data
  const updateData: Record<string, unknown> = {};

  if (typeof isDisabled === "boolean") {
    updateData.isDisabled = isDisabled;
  }

  if (tier && durationDays) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const tierLabel = tier === "PREMIUM" ? "Premium" : tier === "STANDARD" ? "Standard" : "Basic";
    updateData.subscriptionTier = tier;
    updateData.subscriptionStatus = SubscriptionStatus.ACTIVE;
    updateData.adminGrantNote = `🎉 Your account has been upgraded to the **${tierLabel} plan** (active for ${durationDays} day${durationDays === 1 ? "" : "s"}, until ${expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}).`;

    // Upsert the subscription record
    await prisma.subscription.upsert({
      where: { businessId: params.id },
      create: {
        businessId: params.id,
        tier,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: expiresAt,
      },
      update: {
        tier,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: expiresAt,
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: null,
      },
    });
  }

  const updated = await prisma.business.update({
    where: { id: params.id },
    data: updateData,
    select: {
      id: true,
      isDisabled: true,
      name: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      adminGrantNote: true,
      owner: { select: { email: true, fullName: true } },
    },
  });

  // Send email notification for plan grants
  if (tier && durationDays && updated.owner) {
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    sendPlanGrantEmail({
      ownerEmail: updated.owner.email,
      ownerName: updated.owner.fullName,
      businessName: updated.name,
      tier,
      expiresAt,
    }).catch((err) => console.error("[plan-grant] email failed:", err));
  }

  return jsonOk({ business: updated });
}
