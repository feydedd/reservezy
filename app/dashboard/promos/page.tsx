import { getReservezySession } from "@/lib/auth/session";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { PromosClient } from "./promos-client";

export default async function DashboardPromosPage() {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  requireBusinessOwner(ctx);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Promo codes</h1>
        <p className="mt-1 text-sm text-rz-muted">
          Customers can enter a code on the booking page. Use a percentage discount or a fixed amount off (in pence).
        </p>
      </div>
      <PromosClient />
    </div>
  );
}
