"use client";

import { useState } from "react";
import Link from "next/link";
import ListTabs from "@/components/ListTabs";
import StatusBadge from "@/components/StatusBadge";

export interface PoRow {
  id: string;
  poNumber: string;
  title: string;
  vendorName: string;
  status: string;
  landedCostLabel: string;
  ageDays: number;
  fxFlagged: boolean;
}

const TABS = [
  { key: "all", label: "All", match: () => true },
  { key: "open", label: "Open", match: (s: string) => !["fully_received", "closed"].includes(s) },
  { key: "receiving", label: "Receiving", match: (s: string) => ["in_transit", "customs_clearance", "partially_received"].includes(s) },
  { key: "closed", label: "Closed", match: (s: string) => ["fully_received", "closed"].includes(s) },
] as const;

export default function PurchaseOrdersTable({ rows }: { rows: PoRow[] }) {
  const [active, setActive] = useState<string>("all");
  const tabs = TABS.map((t) => ({ key: t.key, label: t.label, count: rows.filter((r) => t.match(r.status)).length }));
  const activeMatch = TABS.find((t) => t.key === active)?.match ?? (() => true);
  const shown = rows.filter((r) => activeMatch(r.status));

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="px-5 pt-1">
        <ListTabs tabs={tabs} active={active} onChange={setActive} filters={["Vendor", "Value"]} />
      </div>

      {shown.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-zinc-400">No purchase orders in this view.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                <th className="px-5 py-3">PO</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3 text-right">Landed cost</th>
                <th className="px-4 py-3 text-right">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {shown.map((po) => (
                <tr key={po.id} className="transition-colors hover:bg-brand-50/40">
                  <td className="px-5 py-3">
                    <Link href={`/purchase-orders/${po.id}`} className="block font-medium text-zinc-900 hover:text-brand-700">
                      {po.title}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-zinc-400">
                      {po.poNumber}
                      {po.fxFlagged && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">FX moved</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{po.vendorName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={po.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-[17px] tabular-nums text-zinc-900">{po.landedCostLabel}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-zinc-500">{po.ageDays}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-zinc-100 px-5 py-3 text-[13px] text-zinc-400">
        Landed cost is the PO total plus recorded freight and customs duty, converted to NGN at the rate on file.
      </div>
    </div>
  );
}
