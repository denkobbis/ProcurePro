"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import type { Profile, OrganizationIndustry } from "@/lib/database.types";
import { getIndustryModules } from "@/lib/industries";
import { useMobileNav } from "./MobileNavContext";
import ThemeToggle from "./ThemeToggle";
import {
  DashboardIcon,
  DocumentIcon,
  CheckCircleIcon,
  CartIcon,
  BuildingIcon,
  TruckIcon,
  ScaleIcon,
  WalletIcon,
  ChartBarIcon,
  CreditCardIcon,
  UsersIcon,
  ExternalLinkIcon,
  ShieldCheckIcon,
  LogoMarkIcon,
} from "./icons";

const RIGSOURCE_URL = "https://rigsource.vercel.app";

const ROLE_LABELS: Record<string, string> = {
  requester: "Requester",
  approver: "Approver",
  procurement_officer: "Procurement Officer",
  finance_admin: "Finance / Admin",
  super_admin: "Super Admin",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

const PRIMARY = [
  { href: "/dashboard", label: "Today", icon: DashboardIcon, roles: null, badge: null as null | "requests" | "approvals" | "po" },
  { href: "/requests", label: "Requests", icon: DocumentIcon, roles: null, badge: "requests" as const },
  { href: "/approvals", label: "Approvals", icon: CheckCircleIcon, roles: ["approver", "finance_admin", "super_admin"], badge: "approvals" as const },
  { href: "/purchase-orders", label: "Purchase orders", icon: CartIcon, roles: ["procurement_officer", "finance_admin", "super_admin"], badge: "po" as const },
  { href: "/vendors", label: "Vendors", icon: BuildingIcon, roles: ["procurement_officer", "finance_admin", "super_admin"], badge: null },
  { href: "/reports", label: "Reports", icon: ChartBarIcon, roles: ["procurement_officer", "finance_admin", "super_admin"], badge: null },
] as const;

const SECONDARY = [
  { href: "/budgets", label: "Budgets", icon: WalletIcon, roles: null },
  { href: "/rfqs", label: "RFQs", icon: ScaleIcon, roles: ["procurement_officer", "finance_admin", "super_admin"] },
  { href: "/equipment", label: "Equipment", icon: TruckIcon, roles: ["procurement_officer", "finance_admin", "super_admin"], module: "equipment" },
  { href: "/billing", label: "Billing", icon: CreditCardIcon, roles: null },
  { href: "/users", label: "Users & departments", icon: UsersIcon, roles: ["finance_admin", "super_admin"] },
  { href: "/approval-rules", label: "Approval rules", icon: ShieldCheckIcon, roles: ["finance_admin", "super_admin"] },
  { href: RIGSOURCE_URL, label: "AI sourcing", icon: ExternalLinkIcon, roles: ["procurement_officer", "finance_admin", "super_admin"], external: true },
] as const;

export interface SidebarCounts {
  requestsOpen: number;
  approvalsAwaiting: number;
  poOpen: number;
}

function Badge({ count, active }: { count: number; active: boolean }) {
  if (!count) return null;
  return (
    <span
      className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
        active ? "bg-brand-600 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      {count}
    </span>
  );
}

export default function Sidebar({
  profile,
  industry,
  orgName,
  counts,
  initialIsDark,
}: {
  profile: Profile;
  industry: OrganizationIndustry;
  orgName: string;
  counts: SidebarCounts;
  initialIsDark: boolean;
}) {
  const pathname = usePathname();
  const { open, setOpen } = useMobileNav();
  const modules = getIndustryModules(industry);

  const badgeValue: Record<NonNullable<(typeof PRIMARY)[number]["badge"]>, number> = {
    requests: counts.requestsOpen,
    approvals: counts.approvalsAwaiting,
    po: counts.poOpen,
  };

  const primary = PRIMARY.filter((l) => !l.roles || (l.roles as readonly string[]).includes(profile.role));
  const secondary = SECONDARY.filter((l) => {
    if (l.roles && !(l.roles as readonly string[]).includes(profile.role)) return false;
    if ("module" in l && l.module === "equipment" && !modules.equipment) return false;
    return true;
  });

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}
      <nav
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-64 shrink-0 flex-col border-r border-zinc-200 bg-white transition-transform duration-200 ease-in-out md:static md:z-auto md:w-[232px] md:translate-x-0 dark:border-zinc-800 dark:bg-zinc-900 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-4">
          <LogoMarkIcon className="h-7 w-7 shrink-0 text-brand-600 dark:text-brand-400" />
          <div className="min-w-0">
            <div className="text-lg font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100">ProcurePro</div>
            <div className="truncate text-xs text-zinc-500 dark:text-zinc-400" title={orgName}>
              {orgName}
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-4">
          <ul className="flex flex-col gap-0.5">
            {primary.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              const Icon = link.icon;
              const count = link.badge ? badgeValue[link.badge] : 0;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2.5 rounded-md border-l-2 py-2 pl-[10px] pr-3 text-sm font-medium transition-colors ${
                      active
                        ? "border-brand-600 bg-brand-50 text-brand-800 dark:border-brand-400 dark:bg-brand-500/10 dark:text-brand-300"
                        : "border-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    }`}
                  >
                    <Icon className={`h-[17px] w-[17px] shrink-0 ${active ? "text-brand-600 dark:text-brand-400" : "text-zinc-400 dark:text-zinc-500"}`} />
                    {link.label}
                    {link.badge && <Badge count={count} active={active} />}
                  </Link>
                </li>
              );
            })}
          </ul>

          {secondary.length > 0 && (
            <div>
              <div className="px-3 pb-1 text-[13px] font-medium text-zinc-400 dark:text-zinc-500">Set up &amp; review</div>
              <ul className="flex flex-col gap-0.5">
                {secondary.map((link) => {
                  const isExternal = "external" in link && link.external;
                  const active = !isExternal && (pathname === link.href || pathname.startsWith(link.href + "/"));
                  const Icon = link.icon;
                  const className = `flex items-center gap-2.5 rounded-md border-l-2 py-1.5 pl-[10px] pr-3 text-[13px] font-medium transition-colors ${
                    active
                      ? "border-brand-600 bg-brand-50 text-brand-800 dark:border-brand-400 dark:bg-brand-500/10 dark:text-brand-300"
                      : "border-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  }`;
                  const iconClassName = `h-4 w-4 shrink-0 ${active ? "text-brand-600 dark:text-brand-400" : "text-zinc-400 dark:text-zinc-500"}`;

                  if (isExternal) {
                    return (
                      <li key={link.href}>
                        <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
                          <Icon className={iconClassName} />
                          {link.label}
                        </a>
                      </li>
                    );
                  }
                  return (
                    <li key={link.href}>
                      <Link href={link.href} onClick={() => setOpen(false)} className={className}>
                        <Icon className={iconClassName} />
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-semibold text-white">
            {initials(profile.full_name)}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-medium text-zinc-900 dark:text-zinc-100">{profile.full_name}</div>
            <div className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">{ROLE_LABELS[profile.role] ?? profile.role}</div>
          </div>
          <ThemeToggle initialIsDark={initialIsDark} className="text-zinc-400 dark:text-zinc-500" />
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Sign out"
              className="rounded-md px-1.5 py-1 text-[11px] text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>
    </>
  );
}
