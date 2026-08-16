"use client";

import { useState } from "react";
import Link from "next/link";
import ListTabs from "@/components/ListTabs";
import StageBar from "@/components/StageBar";

export interface RequestRow {
  id: string;
  requestNumber: string;
  description: string;
  departmentName: string;
  requesterName: string;
  status: string;
  stageFilled: number;
  ageDays: number;
  ageAmber: boolean;
  valueLabel: string;
}

const TABS = [
  { key: "all", label: "All", match: () => true },
  { key: "open", label: "Open", match: (s: string) => !["converted_to_po", "rejected"].includes(s) },
  { key: "converted", label: "Converted to PO", match: (s: string) => s === "converted_to_po" },
  { key: "rejected", label: "Rejected", match: (s: string) => s === "rejected" },
] as const;

export default function RequestsTable({ rows }: { rows: RequestRow[] }) {
  const [active, setActive] = useState<string>("all");
  const tabs = TABS.map((t) => ({ key: t.key, label: t.label, count: rows.filter((r) => t.match(r.status)).length }));
  const activeMatch = TABS.find((t) => t.key === active)?.match ?? (() => true);
  const shown = rows.filter((r) => activeMatch(r.status));

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="px-5 pt-1">
        <ListTabs tabs={tabs} active={active} onChange={setActive} filters={["Requester", "Value", "Department"]} />
      </div>

      {shown.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">No requests in this view.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                <th className="px-5 py-3">Request</th>
                <th className="px-4 py-3">Requester</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3 text-right">Est. value</th>
                <th className="px-4 py-3 text-right">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {shown.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-brand-50/40 dark:hover:bg-zinc-800/60">
                  <td className="px-5 py-3">
                    <Link href={`/requests/${r.id}`} className="block font-medium text-zinc-900 hover:text-brand-700 dark:text-zinc-100 dark:hover:text-brand-400">
                      {r.description}
                    </Link>
                    <div className="mt-0.5 text-[13px] text-zinc-400 dark:text-zinc-500">
                      {r.requestNumber} · {r.departmentName}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{r.requesterName}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StageBar filled={r.stageFilled} />
                      <span className="text-[13px] capitalize text-zinc-500 dark:text-zinc-400">{r.status.replace(/_/g, " ")}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-[17px] tabular-nums text-zinc-900 dark:text-zinc-100">{r.valueLabel}</td>
                  <td className={`whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums ${r.ageAmber ? "font-medium text-amber-700 dark:text-amber-400" : "text-zinc-500 dark:text-zinc-400"}`}>
                    {r.ageDays}d
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-zinc-100 px-5 py-3 text-[13px] text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
        Stage tracks each request from submission through receiving. Age turns amber once a request has waited longer than this org&apos;s usual pace for its current step.
      </div>
    </div>
  );
}
