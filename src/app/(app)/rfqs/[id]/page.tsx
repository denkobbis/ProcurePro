import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";
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
          <h1 className="text-xl font-semibold text-zinc-900">RFQ for {request?.request_number}</h1>
          <p className="text-sm text-zinc-500">{request?.description}</p>
        </div>
        <StatusBadge status={rfq.status} />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-3 font-medium text-zinc-900">Quotes</h2>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-zinc-200 text-left text-zinc-500">
            <tr>
              <th className="py-2">Vendor</th>
              <th>Unit price</th>
              <th>Lead time</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {quoteList.map((q) => (
              <tr key={q.id} className="border-b border-zinc-100">
                <td className="py-2">
                  {vendorMap.get(q.vendor_id) ?? "—"}
                  {q.is_winner && <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Winner</span>}
                </td>
                <td>{formatMoney(q.unit_price, q.currency)}</td>
                <td>{q.lead_time_days ? `${q.lead_time_days} days` : "—"}</td>
                <td className="max-w-xs truncate text-zinc-500">{q.notes ?? "—"}</td>
                <td>
                  {rfq.status === "open" && (
                    <Link
                      href={`/rfqs/${rfq.id}/award?quote_id=${q.id}`}
                      className="rounded-md bg-green-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-800"
                    >
                      Award
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {quoteList.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-zinc-400">
                  No quotes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {rfq.status === "open" && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="mb-3 font-medium text-zinc-900">Add a quote</h2>
          <form action={addRfqQuote} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="hidden" name="rfq_id" value={rfq.id} />
            <select name="vendor_id" required className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm sm:col-span-2">
              <option value="">Vendor...</option>
              {(vendors ?? []).map((v: Vendor) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <input name="unit_price" type="number" min="0" step="0.01" required placeholder="Unit price" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
            <select name="currency" defaultValue="NGN" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm">
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input name="lead_time_days" type="number" min="0" placeholder="Lead time (days)" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
            <input name="notes" placeholder="Notes (optional)" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
            <button className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 sm:col-span-2">
              Add quote
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
