import { z } from "zod";

import { intakeFieldSchema } from "@/lib/intake/fields";
import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import {
  hasIntakeAndAccountingExport,
  hasPremiumFeatures,
} from "@/lib/subscription/tiers";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  pricePence: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  intakeFormFields: z.array(intakeFieldSchema).max(20).optional(),
  businessLocationId: z.string().cuid().nullable().optional(),
});

export async function PATCH(req: Request, { params }: RouteParams): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try { requireBusinessOwner(ctx); } catch { return jsonError("Forbidden.", 403); }

  const service = await prisma.service.findFirst({
    where: { id: params.id, businessId: ctx.businessId },
  });
  if (!service) return jsonError("Service not found.", 404);

  let body: unknown;
  try { body = await req.json(); } catch { return jsonError("Invalid JSON.", 400); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError("Validation failed.", 422, parsed.error.flatten().fieldErrors);

  if (
    parsed.data.intakeFormFields !== undefined &&
    !hasIntakeAndAccountingExport(ctx.subscriptionTier)
  ) {
    return jsonError("Intake forms require Standard or Premium.", 403);
  }

  if (
    parsed.data.businessLocationId !== undefined &&
    parsed.data.businessLocationId !== null &&
    !hasPremiumFeatures(ctx.subscriptionTier)
  ) {
    return jsonError("Locations are a Premium feature.", 403);
  }

  if (parsed.data.businessLocationId) {
    const loc = await prisma.businessLocation.findFirst({
      where: {
        id: parsed.data.businessLocationId,
        businessId: ctx.businessId,
      },
    });
    if (!loc) {
      return jsonError("Invalid location.", 404);
    }
  }

  const { intakeFormFields, ...rest } = parsed.data;
  const updated = await prisma.service.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(intakeFormFields !== undefined
        ? { intakeFormFieldsJson: intakeFormFields }
        : {}),
    },
  });

  return jsonOk({ service: updated });
}

export async function DELETE(_req: Request, { params }: RouteParams): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try { requireBusinessOwner(ctx); } catch { return jsonError("Forbidden.", 403); }

  const service = await prisma.service.findFirst({
    where: { id: params.id, businessId: ctx.businessId },
  });
  if (!service) return jsonError("Service not found.", 404);

  await prisma.service.delete({ where: { id: params.id } });
  return jsonOk({ ok: true });
}
