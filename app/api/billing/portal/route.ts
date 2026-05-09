/**
 * POST /api/billing/portal
 * Creates a Stripe Customer Portal session and redirects.
 * Requires an active business owner session with a stripeCustomerId.
 */

import { getReservezySession } from "@/lib/auth/session";
import { jsonError } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getStripeConfigured } from "@/lib/stripe/client";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";

export const dynamic = "force-dynamic";

export async function POST(_req: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);

  try {
    requireBusinessOwner(ctx);
  } catch {
    return jsonError("Unauthorised.", 403);
  }

  const business = await prisma.business.findUnique({
    where: { id: ctx.businessId },
    select: { stripeCustomerId: true },
  });

  if (!business?.stripeCustomerId) {
    return jsonError("No Stripe customer found. Complete billing setup first.", 400);
  }

  const stripe = getStripeConfigured();
  const returnUrl =
    process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription`
      : "http://localhost:3000/dashboard/subscription";

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: business.stripeCustomerId,
    return_url: returnUrl,
  });

  return Response.redirect(portalSession.url, 303);
}
