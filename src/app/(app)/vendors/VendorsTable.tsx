"use client";

import { useState } from "react";
import Link from "next/link";
import ListTabs from "@/components/ListTabs";

export interface VendorRow {
  id: string;
  name: string;
  ncdmb: boolean;
  sharedAccount: boolean;
  category: string;
  contact: string;
  paymentTerms: string;
  currency: string;
  approved: boolean;
}

const TABS = [
  { key: "all", label: "All", match: () => true },
  { key: "approved", label: "Approved", match: (v: VendorRow) => v.approved },
  { key: "pending", label: "Pending", match: (v: VendorRow) => !v.approved },
  { key: "ncdmb", label: "NCDMB", match: (v: VendorRow) => v.ncdmb },
] as const;

export default function VendorsTable({ rows }: { rows: VendorRow[] }) {
  const [active, setActive] = useState<string>("all");
  const tabs = TABS.map((t) => ({ key: t.key, label: t.label, count: rows.filter(t.match).length }));
  const activeMatch = TABS.find((t) => t.key === active)?.match ?? (() => true);
  const shown = rows.filter(activeMatch);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="px-5 pt-1">
        <ListTabs tabs={tabs} active={active} onChange={setActive} filters={["Category", "Currency"]} />
      </div>

      {shown.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-zinc-400">No vendors in this view.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                <th className="px-5 py-3">Vendor</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Payment terms</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3">Approved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {shown.map((v) => (
                <tr key={v.id} className="transition-colors hover:bg-brand-50/40">
                  <td className="px-5 py-3">
                    <Link href={`/vendors/${v.id}`} className="block font-medium text-zinc-900 hover:text-brand-700">
                      {v.name}
                    </Link>
                    {(v.ncdmb || v.sharedAccount) && (
                      <div className="mt-0.5 flex gap-1.5 text-[13px]">
                        {v.ncdmb && <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-700">NCDMB</span>}
                        {v.sharedAccount && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">Shared account</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{v.category}</td>
                  <td className="px-4 py-3 text-zinc-700">{v.contact}</td>
                  <td className="px-4 py-3 text-zinc-700">{v.paymentTerms}</td>
                  <td className="px-4 py-3 text-zinc-700">{v.currency}</td>
                  <td className="px-4 py-3">
                    {v.approved ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Approved</span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">Pending</span>
                    )}
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
