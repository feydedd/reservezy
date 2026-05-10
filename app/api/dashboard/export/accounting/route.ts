import { getReservezySession } from "@/lib/auth/session";
import { jsonError } from "@/lib/http/api-response";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { prisma } from "@/lib/prisma";
import { hasIntakeAndAccountingExport } from "@/lib/subscription/tiers";

export const dynamic = "force-dynamic";

function csvEscape(value: string): string {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  if (!ctx) {
    return jsonError("Unauthorized.", 401);
  }

  if (!hasIntakeAndAccountingExport(ctx.subscriptionTier)) {
    return jsonError("Accounting export requires Standard or Premium.", 403);
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) {
    return jsonError("Query ?from=ISO&to=ISO required.", 422);
  }
  const fromD = new Date(from);
  const toD = new Date(to);
  if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) {
    return jsonError("Invalid date range.", 422);
  }

  const rows = await prisma.booking.findMany({
    where: {
      businessId: ctx.businessId,
      startsAt: { gte: fromD, lte: toD },
    },
    orderBy: { startsAt: "asc" },
    include: {
      service: { select: { name: true } },
      customer: { select: { fullName: true, email: true } },
      businessLocation: { select: { name: true } },
    },
  });

  const header = [
    "BookingId",
    "DateUTC",
    "Service",
    "Customer",
    "Email",
    "Status",
    "ListPricePence",
    "DiscountPence",
    "NetCollectedPence",
    "Location",
    "IntakeJson",
  ];

  const lines = rows.map((r) =>
    [
      r.id,
      r.startsAt.toISOString(),
      r.service.name,
      r.customer.fullName,
      r.customer.email,
      r.status,
      String(r.discountPence + r.pricePenceSnapshot),
      String(r.discountPence),
      String(r.pricePenceSnapshot),
      r.businessLocation?.name ?? "",
      r.intakeAnswersJson != null ? JSON.stringify(r.intakeAnswersJson) : "",
    ].map((c) => csvEscape(c)),
  );

  const csv = [header.join(","), ...lines.map((cells) => cells.join(","))].join(
    "\n",
  );

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="reservezy-accounting-${from.slice(0, 10)}-${to.slice(0, 10)}.csv"`,
    },
  });
}
