import Link from "next/link";
import {
  LayoutDashboard,
  BarChart2,
  CalendarDays,
  CheckSquare,
  Users,
  Briefcase,
  Clock,
  Settings2,
  Palette,
  Link2,
  CreditCard,
  UserCircle,
  ExternalLink,
  Phone,
  Percent,
  MapPin,
  Star,
  BookOpen,
} from "lucide-react";

import { hasPremiumFeatures, hasStandardNotifications } from "@/lib/subscription/tiers";
import type { DashboardBusinessContext } from "@/lib/server/session-business";
import type { SubscriptionTier } from "@prisma/client";

type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

function publicBookingUrl(subdomain: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
  const appBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const protocol = appBase.startsWith("https") ? "https" : "http";
  return `${protocol}://${subdomain}.${rootDomain}`;
}

function ownerNav(_tier: SubscriptionTier, subdomain: string): NavItem[] {
  return [
    { href: "/dashboard",                 label: "Overview",       Icon: LayoutDashboard },
    { href: "/dashboard/analytics",        label: "Analytics",      Icon: BarChart2 },
    { href: "/dashboard/calendar",         label: "Calendar",       Icon: CalendarDays },
    { href: "/dashboard/bookings",         label: "Bookings",       Icon: CheckSquare },
    { href: "/dashboard/staff",            label: "My team",        Icon: Users },
    { href: "/dashboard/services",         label: "Services",       Icon: Briefcase },
    { href: "/dashboard/availability",     label: "Availability",   Icon: Clock },
    { href: "/dashboard/booking-settings", label: "Booking rules",  Icon: Settings2 },
    { href: "/dashboard/promos",           label: "Promo codes",    Icon: Percent },
    { href: "/dashboard/locations",        label: "Locations",      Icon: MapPin },
    { href: "/dashboard/reviews",          label: "Review prompts", Icon: Star },
    { href: "/dashboard/templates",        label: "Templates",      Icon: BookOpen },
    { href: "/dashboard/branding",         label: "Branding",       Icon: Palette },
    { href: "/dashboard/integrations",     label: "Calendars",      Icon: Link2 },
    { href: "/dashboard/ivr",              label: "Phone IVR",      Icon: Phone },
    { href: "/dashboard/subscription",     label: "Plan & billing", Icon: CreditCard },
    { href: "/dashboard/account",          label: "My account",     Icon: UserCircle },
    { href: publicBookingUrl(subdomain),   label: "Booking page",   Icon: ExternalLink },
  ];
}

const staffNav: NavItem[] = [
  { href: "/dashboard",          label: "Overview",   Icon: LayoutDashboard },
  { href: "/dashboard/calendar", label: "Calendar",   Icon: CalendarDays },
  { href: "/dashboard/bookings", label: "Bookings",   Icon: CheckSquare },
  { href: "/dashboard/account",  label: "My account", Icon: UserCircle },
];

const tierStyles: Record<SubscriptionTier, { label: string; cls: string }> = {
  BASIC:    { label: "Basic",    cls: "text-slate-300 bg-white/[0.07]" },
  STANDARD: { label: "Standard", cls: "text-rz-accent bg-[#8b86f9]/12" },
  PREMIUM:  { label: "Premium",  cls: "text-yellow-300 bg-yellow-400/10" },
};

type DashboardSidebarProps = { ctx: DashboardBusinessContext };

export function DashboardSidebar({ ctx }: DashboardSidebarProps) {
  const items =
    ctx.role === "STAFF" ? staffNav : ownerNav(ctx.subscriptionTier, ctx.subdomain);
  const standard = hasStandardNotifications(ctx.subscriptionTier);
  const premium = hasPremiumFeatures(ctx.subscriptionTier);
  const tier = tierStyles[ctx.subscriptionTier] ?? tierStyles.BASIC;

  return (
    <aside className="w-full shrink-0 border-b border-white/[0.07] bg-[#0a0a20]/90 backdrop-blur-md md:w-60 md:border-b-0 md:border-r md:border-white/[0.07]">
      {/* Business name + plan badge */}
      <div className="border-b border-white/[0.07] px-5 py-4">
        <p className="truncate text-sm font-bold text-white">{ctx.businessName}</p>
        <span
          className={`mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tier.cls}`}
        >
          {tier.label} plan
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-0.5 p-3" aria-label="Dashboard navigation">
        {items.map((item) => {
          const external = item.href.startsWith("http");
          const base =
            "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all";

          if (external) {
            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${base} text-rz-accent hover:bg-[#8b86f9]/10`}
              >
                <item.Icon className="h-4 w-4 shrink-0 opacity-75 group-hover:opacity-100" />
                {item.label}
                <ExternalLink className="ml-auto h-3 w-3 opacity-40" />
              </a>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${base} text-rz-muted hover:bg-white/[0.06] hover:text-white`}
            >
              <item.Icon className="h-4 w-4 shrink-0 opacity-60 group-hover:opacity-100" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade nudge */}
      {!premium && (
        <div className="m-3 rounded-xl border border-[#8b86f9]/20 bg-[#8b86f9]/[0.07] p-4">
          <p className="text-xs font-semibold text-rz-accent">
            {!standard ? "Upgrade to Standard" : "Upgrade to Premium"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-rz-subtle">
            {!standard
              ? "Unlock email & SMS reminders, intake forms, and accounting export."
              : "Unlock calendar sync, multi-location, review prompts, and the template library."}
          </p>
          <Link
            href="/dashboard/subscription"
            className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#8b86f9]/20 px-3 py-1 text-xs font-semibold text-rz-accent transition hover:bg-[#8b86f9]/30"
          >
            See plans →
          </Link>
        </div>
      )}
    </aside>
  );
}
