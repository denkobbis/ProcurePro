"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/database.types";
import { useMobileNav } from "./MobileNavContext";

const ALL_LINKS = [
  { href: "/dashboard", label: "Dashboard", roles: null },
  { href: "/requests", label: "Purchase Requests", roles: null },
  { href: "/approvals", label: "Approvals", roles: ["approver", "finance_admin", "super_admin"] },
  { href: "/purchase-orders", label: "Purchase Orders", roles: ["procurement_officer", "finance_admin", "super_admin"] },
  { href: "/vendors", label: "Vendors", roles: ["procurement_officer", "finance_admin", "super_admin"] },
  { href: "/equipment", label: "Equipment", roles: ["procurement_officer", "finance_admin", "super_admin"] },
  { href: "/rfqs", label: "RFQs", roles: ["procurement_officer", "finance_admin", "super_admin"] },
  { href: "/budgets", label: "Budgets", roles: null },
  { href: "/reports", label: "Reports", roles: ["procurement_officer", "finance_admin", "super_admin"] },
  { href: "/users", label: "Users & Departments", roles: ["finance_admin", "super_admin"] },
] as const;

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const { open, setOpen } = useMobileNav();
  const links = ALL_LINKS.filter((l) => !l.roles || (l.roles as readonly string[]).includes(profile.role));

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
      )}
      <nav
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-64 shrink-0 flex-col border-r border-zinc-200 bg-white px-3 py-4 transition-transform duration-200 ease-in-out md:static md:z-auto md:w-56 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-2 pb-4 text-lg font-semibold text-zinc-900">ProcurePro</div>
        <ul className="flex flex-1 flex-col gap-1">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-md px-3 py-2 text-sm font-medium ${
                    active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
