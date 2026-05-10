import { getReservezySession } from "@/lib/auth/session";
import { UpgradeButton } from "@/components/dashboard/upgrade-button";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { prisma } from "@/lib/prisma";

const tierInfo = {
  BASIC: {
    label: "Basic",
    price: "£14.99/mo",
    color: "text-slate-300",
    features: [
      "Public booking page & calendar dashboard",
      "In-app checklist, referrals & promo codes",
      "Internal notes (team-only)",
      "Buffer time & holidays",
    ],
  },
  STANDARD: {
    label: "Standard",
    price: "£29.99/mo",
    color: "text-rz-accent",
    features: [
      "Everything in Basic",
      "Email & SMS notifications & staff tools",
      "Client intake forms",
      "Accounting export (CSV)",
    ],
  },
  PREMIUM: {
    label: "Premium",
    price: "£49.99/mo",
    color: "text-yellow-300",
    features: [
      "Everything in Standard",
      "Google Calendar & Outlook sync",
      "Custom branding (logo, colours, fonts)",
      "Full analytics & cancel/reschedule links",
      "Multi-location, review prompts & template library",
    ],
  },
};

export default async function DashboardSubscriptionPage({
  searchParams,
}: {
  searchParams: { upgrade?: string };
}) {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  requireBusinessOwner(ctx);

  const sub = await prisma.subscription.findUnique({
    where: { businessId: ctx.businessId },
  });

  const business = await prisma.business.findUnique({
    where: { id: ctx.businessId },
    select: { stripeCustomerId: true, stripeSubscriptionId: true },
  });

  const info = tierInfo[ctx.subscriptionTier];
  const hasStripe = Boolean(business?.stripeCustomerId);

  const periodEnd = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Plan &amp; billing</h1>
        <p className="mt-1 text-sm text-rz-muted">Manage your Reservezy subscription.</p>
      </div>

      {searchParams.upgrade === "success" && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-300">
          ✓ Your plan has been upgraded successfully!
        </div>
      )}
      {searchParams.upgrade === "cancel" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Checkout was cancelled — your plan hasn&apos;t changed.
        </div>
      )}

      {/* Current plan */}
      <div className="rz-card p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-rz-subtle">Current plan</p>
            <p className={`mt-1 text-2xl font-extrabold ${info.color}`}>{info.label}</p>
            <p className="text-sm text-rz-muted">{info.price}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold text-rz-muted">Status</p>
            <p className="font-bold text-white">{ctx.subscriptionStatus}</p>
            {periodEnd && (
              <p className="mt-1 text-xs text-rz-subtle">Renews {periodEnd}</p>
            )}
            {sub?.cancelAtPeriodEnd && (
              <p className="mt-1 text-xs text-amber-300">Cancels at period end</p>
            )}
          </div>
        </div>

        <ul className="mt-6 space-y-2">
          {info.features.map((f) => (
            <li key={f} className="flex items-center gap-2.5 text-sm text-rz-muted">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#8b86f9]/15 text-[10px] font-bold text-rz-accent">✓</span>
              {f}
            </li>
          ))}
        </ul>

        {hasStripe && (
          <form action="/api/billing/portal" method="POST" className="mt-6">
            <button
              type="submit"
              className="rz-btn-ghost px-5 py-2.5 text-sm"
            >
              Manage billing in Stripe →
            </button>
          </form>
        )}
      </div>

      {/* Upgrade options */}
      {ctx.subscriptionTier !== "PREMIUM" && (
        <div>
          <h2 className="mb-4 text-lg font-bold text-white">Upgrade your plan</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["STANDARD", "PREMIUM"] as const)
              .filter((t) => {
                const tiers = ["BASIC", "STANDARD", "PREMIUM"];
                return tiers.indexOf(t) > tiers.indexOf(ctx.subscriptionTier);
              })
              .map((t) => {
                const ti = tierInfo[t];
                return (
                  <div key={t} className="rz-card p-6">
                    <p className={`text-lg font-extrabold ${ti.color}`}>{ti.label}</p>
                    <p className="text-sm text-rz-muted">{ti.price}</p>
                    <ul className="mt-4 space-y-2">
                      {ti.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs text-rz-muted">
                          <span className="text-rz-accent">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                    <UpgradeButton tier={t} label={ti.label} />
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Stripe debug info */}
      {business?.stripeSubscriptionId && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
          <p className="text-xs font-semibold text-rz-subtle">Stripe subscription</p>
          <p className="mt-1 font-mono text-xs text-rz-muted">{business.stripeSubscriptionId}</p>
        </div>
      )}
    </div>
  );
}
