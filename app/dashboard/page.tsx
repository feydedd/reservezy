import Link from "next/link";

import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardStats } from "@/lib/server/dashboard-stats";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { BookingLinkWidget } from "@/components/dashboard/booking-link-widget";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import { StatsWithModal } from "@/components/dashboard/stats-with-modal";

function formatMoney(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

export default async function DashboardHomePage() {
  const session = await getReservezySession();
  const ctx     = await loadDashboardBusinessContext(session);
  if (!ctx) return null;

  const stats = await loadDashboardStats(ctx);

  const statConfig = [
    { key: "today"    as const, label: "Bookings today", value: String(stats.bookingsToday),          clickable: true },
    { key: "week"     as const, label: "This week",      value: String(stats.bookingsThisWeek),        clickable: true },
    { key: "month"    as const, label: "This month",     value: String(stats.bookingsThisMonth),       clickable: true },
    { key: "upcoming" as const, label: "Upcoming",       value: String(stats.upcomingBookings),        clickable: true },
    { key: "revenue"  as const, label: "Revenue (month)",value: formatMoney(stats.revenueThisMonthPence), clickable: false },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Overview</h1>
        <p className="mt-1 text-sm text-rz-muted">
          Signed in as{" "}
          <span className="font-semibold text-white">{session?.user.email}</span>{" "}
          · {ctx.role === "BUSINESS_OWNER" ? "Owner" : "Staff"}
        </p>
      </div>

      {ctx.role === "BUSINESS_OWNER" && <SetupChecklist />}

      {/* Stat tiles — today / week / month / upcoming are clickable */}
      <StatsWithModal stats={statConfig} />

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/analytics" className="rz-btn-ghost px-4 py-2 text-sm">Full analytics</Link>
        <Link href="/dashboard/bookings"  className="rz-btn-primary px-4 py-2 text-sm">Manage bookings</Link>
      </div>

      {/* Booking link + sharing */}
      <BookingLinkWidget subdomain={ctx.subdomain} />
    </div>
  );
}
