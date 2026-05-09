import { getReservezySession } from "@/lib/auth/session";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import ServicesManager from "@/components/dashboard/services-manager";

export default async function DashboardServicesPage() {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  requireBusinessOwner(ctx);

  return <ServicesManager />;
}
