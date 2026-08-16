"use client";

import { useState } from "react";
import Link from "next/link";
import ListTabs from "@/components/ListTabs";
import StatusBadge from "@/components/StatusBadge";

export interface EquipmentRow {
  id: string;
  assetTag: string;
  name: string;
  category: string;
  dayRateLabel: string;
  status: string;
}

const TABS = [
  { key: "all", label: "All", match: () => true },
  { key: "available", label: "Available", match: (s: string) => s === "available" },
  { key: "on_lease", label: "On lease", match: (s: string) => s === "on_lease" },
  { key: "maintenance", label: "Maintenance", match: (s: string) => s === "maintenance" },
  { key: "retired", label: "Retired", match: (s: string) => s === "retired" },
] as const;

export default function EquipmentTable({ rows }: { rows: EquipmentRow[] }) {
  const [active, setActive] = useState<string>("all");
  const tabs = TABS.map((t) => ({ key: t.key, label: t.label, count: rows.filter((r) => t.match(r.status)).length })).filter((t) => t.key === "all" || t.count > 0);
  const activeMatch = TABS.find((t) => t.key === active)?.match ?? (() => true);
  const shown = rows.filter((r) => activeMatch(r.status));

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="px-5 pt-1">
        <ListTabs tabs={tabs} active={active} onChange={setActive} />
      </div>

      {shown.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-zinc-400">No equipment in this view.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                <th className="px-5 py-3">Asset tag</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Day rate</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {shown.map((a) => (
                <tr key={a.id} className="transition-colors hover:bg-brand-50/40">
                  <td className="px-5 py-3">
                    <Link href={`/equipment/${a.id}`} className="font-medium text-zinc-900 hover:text-brand-700">
                      {a.assetTag}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{a.name}</td>
                  <td className="px-4 py-3 text-zinc-700">{a.category}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-[17px] tabular-nums text-zinc-900">{a.dayRateLabel}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
