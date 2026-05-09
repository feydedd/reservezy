import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import WeeklyCalendar from "@/components/dashboard/weekly-calendar";

export default async function DashboardCalendarPage() {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);

  return <WeeklyCalendar timezone={ctx?.timezone ?? "Europe/London"} />;
}
