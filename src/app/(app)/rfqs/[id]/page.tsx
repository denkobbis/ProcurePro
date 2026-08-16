import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import { ScaleIcon, SparkleIcon } from "@/components/icons";
import { addRfqQuote } from "@/app/actions/rfq";
import { rankQuotes } from "@/lib/quote-compare";
import { RecordHeader, RecordSection, NotePanel } from "@/components/RecordPanels";
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
  const ranked = rankQuotes(quoteList, request?.qty ?? 1);
  const rankedByQuoteId = new Map(ranked.map((r) => [r.quote.id, r]));

  return (
    <div className="max-w-4xl space-y-4">
      <RecordHeader
        backHref="/rfqs"
        backLabel="Back to RFQs"
        title={`RFQ for ${request?.request_number}`}
        subline={request?.description}
        badges={<StatusBadge status={rfq.status} />}
      />

      <RecordSection title="Quotes">
        {quoteList.length >= 2 && (
          <NotePanel>
            <span className="flex items-start gap-2">
              <SparkleIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
              Auto-ranked by total price (qty × unit price) and lead time — Cheapest, Fastest, and Recommended badges below.
            </span>
          </NotePanel>
        )}
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          {quoteList.length === 0 ? (
            <EmptyState icon={<ScaleIcon />} title="No quotes yet" />
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                  <th className="px-5 py-2.5">Vendor</th>
                  <th className="px-4 py-2.5">Unit price</th>
                  <th className="px-4 py-2.5">Total</th>
                  <th className="px-4 py-2.5">Lead time</th>
                  <th className="px-4 py-2.5">Notes</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {quoteList.map((q) => {
                  const r = rankedByQuoteId.get(q.id);
                  return (
                    <tr key={q.id} className="transition-colors hover:bg-brand-50/40 dark:hover:bg-zinc-800">
                      <td className="px-5 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                        {vendorMap.get(q.vendor_id) ?? "—"}
                        {q.is_winner && <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">Winner</span>}
                        {quoteList.length >= 2 && (
                          <span className="mt-1 flex flex-wrap gap-1">
                            {r?.isRecommended && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">Recommended</span>}
                            {r?.isCheapest && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">Cheapest</span>}
                            {r?.isFastest && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">Fastest</span>}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-zinc-700 dark:text-zinc-300">{formatMoney(q.unit_price, q.currency)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[17px] tabular-nums font-medium text-zinc-900 dark:text-zinc-100">{r ? formatMoney(r.total, q.currency) : "—"}</td>
                      <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{q.lead_time_days ? `${q.lead_time_days} days` : "—"}</td>
                      <td className="max-w-xs truncate px-4 py-2.5 text-zinc-500 dark:text-zinc-400">{q.notes ?? "—"}</td>
                      <td className="px-4 py-2.5">
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
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </RecordSection>

      {rfq.status === "open" && (
        <RecordSection title="Add a quote">
          <form action={addRfqQuote} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="hidden" name="rfq_id" value={rfq.id} />
            <select name="vendor_id" required className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              <option value="">Vendor...</option>
              {(vendors ?? []).map((v: Vendor) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <input name="unit_price" type="number" min="0" step="0.01" required placeholder="Unit price" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            <select name="currency" defaultValue="NGN" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input name="lead_time_days" type="number" min="0" placeholder="Lead time (days)" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            <input name="notes" placeholder="Notes (optional)" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            <Button type="submit" className="sm:col-span-2">Add quote</Button>
          </form>
        </RecordSection>
      )}
    </div>
  );
}
