import { getReservezySession } from "@/lib/auth/session";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import BookingSettingsForm from "@/components/dashboard/booking-settings-form";

export default async function DashboardBookingSettingsPage() {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  requireBusinessOwner(ctx);

  return <BookingSettingsForm />;
}
