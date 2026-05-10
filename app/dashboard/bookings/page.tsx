import { BookingsPanel } from "@/components/dashboard/bookings-panel";
import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { hasIntakeAndAccountingExport } from "@/lib/subscription/tiers";

export default async function DashboardBookingsPage() {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  const accounting = Boolean(
    ctx && hasIntakeAndAccountingExport(ctx.subscriptionTier),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Bookings</h1>
          <p className="text-sm text-slate-400">
            Confirm, complete, or cancel appointments. Use filters to narrow the list.
          </p>
        </div>
        {accounting && (
          <AccountingExportButton />
        )}
      </div>
      <BookingsPanel canExportAccounting={accounting} />
    </div>
  );
}

function AccountingExportButton() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 90);
  const qs = `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
  return (
    <a
      href={`/api/dashboard/export/accounting?${qs}`}
      className="rz-btn-ghost shrink-0 px-4 py-2 text-sm"
    >
      Accounting export (CSV)
    </a>
  );
}
