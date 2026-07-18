import { notFound } from "next/navigation";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { awardRfqQuote } from "@/app/actions/rfq";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/Button";

export default async function AwardRfqQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ quote_id?: string }>;
}) {
  const { id } = await params;
  const { quote_id: quoteId } = await searchParams;
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  if (!quoteId) notFound();

  const supabase = await createClient();
  const { data: rfq } = await supabase.from("rfqs").select("*").eq("id", id).single();
  if (!rfq || rfq.status !== "open") notFound();

  const { data: quote } = await supabase.from("rfq_quotes").select("*").eq("id", quoteId).single();
  if (!quote) notFound();

  const { data: vendor } = await supabase.from("vendors").select("*").eq("id", quote.vendor_id).single();
  const { data: request } = await supabase.from("requests").select("*").eq("id", rfq.request_id).single();

  return (
    <div className="max-w-xl space-y-4">
      <PageHeader
        title="Award quote & create PO"
        description={`${vendor?.name} — ${formatMoney(quote.unit_price, quote.currency)} × ${request?.qty} for ${request?.description}`}
      />

      <form action={awardRfqQuote} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <input type="hidden" name="quote_id" value={quote.id} />
        <input type="hidden" name="rfq_id" value={rfq.id} />

        <div>
          <label className="block text-sm font-medium text-zinc-700">Delivery terms</label>
          <textarea name="delivery_terms" rows={2} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>

        <div className="space-y-3 rounded-md border border-zinc-100 p-3">
          <label className="block text-sm font-medium text-zinc-700">Landed cost</label>
          <p className="text-xs text-zinc-500">Currency is fixed by the quote ({quote.currency}) — set the FX rate and any freight/customs cost.</p>
          {quote.currency !== "NGN" && (
            <div>
              <label className="block text-xs text-zinc-500">FX rate to ₦ (1 {quote.currency} = ? NGN)</label>
              <input name="fx_rate_to_ngn" type="number" step="0.000001" min="0" defaultValue={1} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-zinc-500">Freight cost (₦)</label>
              <input name="freight_cost_ngn" type="number" step="0.01" min="0" defaultValue={0} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500">Customs duty (₦)</label>
              <input name="customs_duty_ngn" type="number" step="0.01" min="0" defaultValue={0} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>
        </div>

        <Button type="submit" variant="success">Award &amp; create Purchase Order</Button>
      </form>
    </div>
  );
}
