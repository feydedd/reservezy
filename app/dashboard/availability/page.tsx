import { getReservezySession } from "@/lib/auth/session";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import AvailabilityEditor from "@/components/dashboard/availability-editor";

export default async function DashboardAvailabilityPage() {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  requireBusinessOwner(ctx);

  return <AvailabilityEditor />;
}
