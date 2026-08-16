"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/actions/auth";
import { ChevronDownIcon } from "./icons";

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

export default function UserMenu({ fullName, role }: { fullName: string; role: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md py-1 pl-1 pr-1.5 hover:bg-zinc-100"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-semibold text-white">
          {initials(fullName)}
        </div>
        <ChevronDownIcon className="hidden h-3.5 w-3.5 text-zinc-400 sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg">
          <div className="border-b border-zinc-100 px-3.5 py-3">
            <div className="truncate text-sm font-medium text-zinc-900">{fullName}</div>
            <div className="truncate text-xs text-zinc-500">{ROLE_LABELS[role] ?? role}</div>
          </div>
          <form action={signOut}>
            <button type="submit" className="block w-full px-3.5 py-2.5 text-left text-sm text-red-600 hover:bg-red-50">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
