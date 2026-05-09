import { BookingsPanel } from "@/components/dashboard/bookings-panel";

export default function DashboardBookingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Bookings</h1>
        <p className="text-sm text-slate-400">
          Confirm, complete, or cancel appointments. Filters and CSV export arrive in a
          follow-up pass.
        </p>
      </div>
      <BookingsPanel />
    </div>
  );
}
