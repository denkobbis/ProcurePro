"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/database.types";
import { useMobileNav } from "./MobileNavContext";
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
  UsersIcon,
  LogoMarkIcon,
} from "./icons";

const GROUPS = [
  {
    label: null,
    links: [{ href: "/dashboard", label: "Dashboard", icon: DashboardIcon, roles: null }],
  },
  {
    label: "Workflow",
    links: [
      { href: "/requests", label: "Purchase Requests", icon: DocumentIcon, roles: null },
      { href: "/approvals", label: "Approvals", icon: CheckCircleIcon, roles: ["approver", "finance_admin", "super_admin"] },
    ],
  },
  {
    label: "Procurement",
    links: [
      { href: "/purchase-orders", label: "Purchase Orders", icon: CartIcon, roles: ["procurement_officer", "finance_admin", "super_admin"] },
      { href: "/vendors", label: "Vendors", icon: BuildingIcon, roles: ["procurement_officer", "finance_admin", "super_admin"] },
      { href: "/equipment", label: "Equipment", icon: TruckIcon, roles: ["procurement_officer", "finance_admin", "super_admin"] },
      { href: "/rfqs", label: "RFQs", icon: ScaleIcon, roles: ["procurement_officer", "finance_admin", "super_admin"] },
    ],
  },
  {
    label: "Finance",
    links: [
      { href: "/budgets", label: "Budgets", icon: WalletIcon, roles: null },
      { href: "/reports", label: "Reports", icon: ChartBarIcon, roles: ["procurement_officer", "finance_admin", "super_admin"] },
    ],
  },
  {
    label: "Admin",
    links: [{ href: "/users", label: "Users & Departments", icon: UsersIcon, roles: ["finance_admin", "super_admin"] }],
  },
] as const;

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const { open, setOpen } = useMobileNav();

  const groups = GROUPS.map((group) => ({
    ...group,
    links: group.links.filter((l) => !l.roles || (l.roles as readonly string[]).includes(profile.role)),
  })).filter((group) => group.links.length > 0);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
      )}
      <nav
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-64 shrink-0 flex-col border-r border-zinc-200 bg-white px-3 py-4 transition-transform duration-200 ease-in-out md:static md:z-auto md:w-60 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-2 pb-5">
          <LogoMarkIcon className="h-7 w-7 text-blue-600" />
          <span className="text-lg font-semibold tracking-tight text-zinc-900">ProcurePro</span>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {groups.map((group, i) => (
            <div key={i}>
              {group.label && (
                <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{group.label}</div>
              )}
              <ul className="flex flex-col gap-0.5">
                {group.links.map((link) => {
                  const active = pathname === link.href || pathname.startsWith(link.href + "/");
                  const Icon = link.icon;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          active ? "bg-blue-50 text-blue-700" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                        }`}
                      >
                        <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-blue-600" : "text-zinc-400"}`} />
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
