import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import AccountForm from "@/components/dashboard/account-form";

export default async function DashboardAccountPage() {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);

  return <AccountForm role={ctx?.role ?? "STAFF"} />;
}
