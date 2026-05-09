import Link from "next/link";

import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardStats } from "@/lib/server/dashboard-stats";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";

function formatMoney(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

export default async function DashboardHomePage() {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  if (!ctx) {
    return null;
  }

  const stats = await loadDashboardStats(ctx);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Overview</h1>
        <p className="mt-1 text-sm text-rz-muted">
          Signed in as{" "}
          <span className="font-semibold text-white">{session?.user.email}</span> ·{" "}
          {ctx.role === "BUSINESS_OWNER" ? "Owner" : "Staff"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Bookings today", String(stats.bookingsToday)],
          ["This week", String(stats.bookingsThisWeek)],
          ["This month", String(stats.bookingsThisMonth)],
          ["Upcoming", String(stats.upcomingBookings)],
          ["Revenue (month)", formatMoney(stats.revenueThisMonthPence)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rz-card-hover p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-rz-subtle">{label}</p>
            <p className="mt-2 text-3xl font-extrabold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/analytics"
          className="rz-btn-ghost px-4 py-2 text-sm"
        >
          Full analytics
        </Link>
        <Link
          href="/dashboard/bookings"
          className="rz-btn-primary px-4 py-2 text-sm"
        >
          Manage bookings
        </Link>
      </div>
    </div>
  );
}
