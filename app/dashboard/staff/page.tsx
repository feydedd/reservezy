import { getReservezySession } from "@/lib/auth/session";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import StaffManager from "@/components/dashboard/staff-manager";

export default async function DashboardStaffPage() {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  requireBusinessOwner(ctx);

  return <StaffManager />;
}
