"use client";

import { useState } from "react";
import Link from "next/link";
import ListTabs from "@/components/ListTabs";
import StatusBadge from "@/components/StatusBadge";

export interface RfqRow {
  id: string;
  requestNumber: string;
  requestDescription: string;
  quoteCount: number;
  bestTotalLabel: string | null;
  leadTimeLabel: string;
  status: string;
  raisedDaysAgo: number;
}

const TABS = [
  { key: "all", label: "All", match: () => true },
  { key: "open", label: "Open", match: (s: string) => s === "open" },
  { key: "awarded", label: "Awarded", match: (s: string) => s === "awarded" },
  { key: "cancelled", label: "Cancelled", match: (s: string) => s === "cancelled" },
] as const;

export default function RfqsTable({ rows }: { rows: RfqRow[] }) {
  const [active, setActive] = useState<string>("all");
  const tabs = TABS.map((t) => ({ key: t.key, label: t.label, count: rows.filter((r) => t.match(r.status)).length }));
  const activeMatch = TABS.find((t) => t.key === active)?.match ?? (() => true);
  const shown = rows.filter((r) => activeMatch(r.status));

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="px-5 pt-1">
        <ListTabs tabs={tabs} active={active} onChange={setActive} />
      </div>

      {shown.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">No RFQs in this view.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                <th className="px-5 py-3">RFQ for</th>
                <th className="px-4 py-3">Quotes</th>
                <th className="px-4 py-3 text-right">Best total</th>
                <th className="px-4 py-3">Lead time</th>
                <th className="px-4 py-3 text-right">Raised</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {shown.map((rfq) => (
                <tr key={rfq.id} className="transition-colors hover:bg-brand-50/40 dark:hover:bg-zinc-800">
                  <td className="px-5 py-3">
                    <Link href={`/rfqs/${rfq.id}`} className="block font-medium text-zinc-900 hover:text-brand-700 dark:text-zinc-100 dark:hover:text-brand-400">
                      {rfq.requestDescription}
                    </Link>
                    <div className="mt-0.5 text-[13px] text-zinc-400 dark:text-zinc-500">{rfq.requestNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {rfq.quoteCount} <StatusBadge status={rfq.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-[17px] tabular-nums text-zinc-900 dark:text-zinc-100">
                    {rfq.bestTotalLabel ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{rfq.leadTimeLabel}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-400">{rfq.raisedDaysAgo}d ago</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
