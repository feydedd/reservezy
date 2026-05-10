import { getReservezySession } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http/api-response";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { prisma } from "@/lib/prisma";
import { dashboardBookingStatusPatchSchema } from "@/schemas/dashboard-bookings";

export const dynamic = "force-dynamic";

type RouteParams = { params: { bookingId: string } };

export async function PATCH(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  if (!ctx) {
    return jsonError("Unauthorized.", 401);
  }

  let bodyUnknown: unknown;
  try {
    bodyUnknown = await request.json();
  } catch {
    return jsonError("Invalid JSON.", 400);
  }

  const parsed = dashboardBookingStatusPatchSchema.safeParse(bodyUnknown);
  if (!parsed.success) {
    return jsonError("Validation failed.", 422, parsed.error.flatten().fieldErrors);
  }

  const booking = await prisma.booking.findFirst({
    where: {
      id: params.bookingId,
      businessId: ctx.businessId,
    },
  });

  if (!booking) {
    return jsonError("Booking not found.", 404);
  }

  if (ctx.role === "STAFF" && ctx.staffMemberId) {
    const assignedElsewhere =
      booking.staffMemberId !== null &&
      booking.staffMemberId !== ctx.staffMemberId;
    if (assignedElsewhere) {
      return jsonError("Forbidden.", 403);
    }
  }

  const data: { status?: typeof parsed.data.status; staffNotes?: string } = {};
  if (parsed.data.status !== undefined) {
    data.status = parsed.data.status;
  }
  if (parsed.data.staffNotes !== undefined) {
    data.staffNotes = parsed.data.staffNotes;
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data,
    select: {
      id: true,
      status: true,
      staffNotes: true,
    },
  });

  return jsonOk({ booking: updated });
}
