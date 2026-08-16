import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import EmptyState from "@/components/EmptyState";
import { ScaleIcon } from "@/components/icons";
import RfqsTable, { type RfqRow } from "./RfqsTable";
import type { Rfq, RfqQuote } from "@/lib/database.types";

function daysSince(iso: string): number {
  return Math.round((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

export default async function RfqsPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  const supabase = await createClient();
  const { data: rfqs } = await supabase
    .from("rfqs")
    .select("*, requests(request_number, description)")
    .order("created_at", { ascending: false });

  const rows = (rfqs ?? []) as (Rfq & { requests: { request_number: string; description: string } | null })[];
  const rfqIds = rows.map((r) => r.id);
  const { data: quotes } = rfqIds.length
    ? await supabase.from("rfq_quotes").select("*").in("rfq_id", rfqIds)
    : { data: [] as RfqQuote[] };

  const quotesByRfq = new Map<string, RfqQuote[]>();
  for (const q of (quotes ?? []) as RfqQuote[]) {
    quotesByRfq.set(q.rfq_id, [...(quotesByRfq.get(q.rfq_id) ?? []), q]);
  }

  const tableRows: RfqRow[] = rows.map((rfq) => {
    const rfqQuotes = quotesByRfq.get(rfq.id) ?? [];
    const best = rfqQuotes.length ? rfqQuotes.reduce((a, b) => (a.unit_price < b.unit_price ? a : b)) : null;
    return {
      id: rfq.id,
      requestNumber: rfq.requests?.request_number ?? "—",
      requestDescription: rfq.requests?.description ?? "Request for quote",
      quoteCount: rfqQuotes.length,
      bestTotalLabel: best ? formatMoney(best.unit_price, best.currency) : null,
      leadTimeLabel: best?.lead_time_days != null ? `${best.lead_time_days}d` : "—",
      status: rfq.status,
      raisedDaysAgo: daysSince(rfq.created_at),
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[38px] font-semibold leading-none tracking-tight text-zinc-900 dark:text-zinc-100">RFQs</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Compare vendor quotes before committing to a purchase order.</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <EmptyState icon={<ScaleIcon />} title="No RFQs yet" description="Start one from an approved request to compare vendor quotes." />
        </div>
      ) : (
        <RfqsTable rows={tableRows} />
      )}
    </div>
  );
}
