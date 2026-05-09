import { redirect } from "next/navigation";

import type { DashboardBusinessContext } from "@/lib/server/session-business";

export function requireBusinessOwner(
  ctx: DashboardBusinessContext | null,
): asserts ctx is DashboardBusinessContext & { role: "BUSINESS_OWNER" } {
  if (!ctx || ctx.role !== "BUSINESS_OWNER") {
    redirect("/dashboard");
  }
}
