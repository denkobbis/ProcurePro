import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import { ScaleIcon } from "@/components/icons";
import { addRfqQuote } from "@/app/actions/rfq";
import type { RfqQuote, Vendor } from "@/lib/database.types";

const CURRENCIES = ["NGN", "USD", "EUR", "GBP"] as const;

export default async function RfqDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  const supabase = await createClient();
  const { data: rfq } = await supabase.from("rfqs").select("*").eq("id", id).single();
  if (!rfq) notFound();

  const [{ data: request }, { data: quotes }, { data: vendors }] = await Promise.all([
    supabase.from("requests").select("*").eq("id", rfq.request_id).single(),
    supabase.from("rfq_quotes").select("*").eq("rfq_id", id).order("unit_price"),
    supabase.from("vendors").select("*").eq("is_approved", true).order("name"),
  ]);

  const vendorMap = new Map((vendors ?? []).map((v: Vendor) => [v.id, v.name]));
  const quoteList = (quotes ?? []) as RfqQuote[];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">RFQ for {request?.request_number}</h1>
          <p className="text-sm text-zinc-500">{request?.description}</p>
        </div>
        <StatusBadge status={rfq.status} />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <h2 className="border-b border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-900">Quotes</h2>
        <div className="overflow-x-auto">
          {quoteList.length === 0 ? (
            <EmptyState icon={<ScaleIcon />} title="No quotes yet" />
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50/70 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-6 py-3">Vendor</th>
                  <th className="px-4 py-3">Unit price</th>
                  <th className="px-4 py-3">Lead time</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {quoteList.map((q) => (
                  <tr key={q.id} className="transition-colors hover:bg-blue-50/40">
                    <td className="px-6 py-3 font-medium text-zinc-900">
                      {vendorMap.get(q.vendor_id) ?? "—"}
                      {q.is_winner && <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Winner</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{formatMoney(q.unit_price, q.currency)}</td>
                    <td className="px-4 py-3 text-zinc-700">{q.lead_time_days ? `${q.lead_time_days} days` : "—"}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-zinc-500">{q.notes ?? "—"}</td>
                    <td className="px-4 py-3">
                      {rfq.status === "open" && (
                        <Link
                          href={`/rfqs/${rfq.id}/award?quote_id=${q.id}`}
                          className="rounded-md bg-green-700 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-green-800"
                        >
                          Award
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {rfq.status === "open" && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Add a quote</h2>
          <form action={addRfqQuote} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="hidden" name="rfq_id" value={rfq.id} />
            <select name="vendor_id" required className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:col-span-2">
              <option value="">Vendor...</option>
              {(vendors ?? []).map((v: Vendor) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <input name="unit_price" type="number" min="0" step="0.01" required placeholder="Unit price" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            <select name="currency" defaultValue="NGN" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input name="lead_time_days" type="number" min="0" placeholder="Lead time (days)" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            <input name="notes" placeholder="Notes (optional)" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            <Button type="submit" className="sm:col-span-2">Add quote</Button>
          </form>
        </div>
      )}
    </div>
  );
}
