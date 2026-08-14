import type { SupabaseClient } from "@supabase/supabase-js";

export interface VendorScorecard {
  quoteCount: number;
  avgResponseDays: number | null;
  poCount: number;
  fullyReceivedRate: number | null;
  fulfillmentRate: number | null;
}

/**
 * Computed from data ProcurePro already records (RFQ quotes, PO status,
 * line-item receiving) — no LLM involved, and every number here is a plain
 * aggregate a user could reproduce by hand from the same tables.
 */
export async function getVendorScorecard(supabase: SupabaseClient, vendorId: string): Promise<VendorScorecard> {
  const [{ data: quotes }, { data: pos }] = await Promise.all([
    supabase.from("rfq_quotes").select("created_at, rfqs(created_at)").eq("vendor_id", vendorId),
    supabase.from("purchase_orders").select("id, status").eq("vendor_id", vendorId).neq("status", "draft"),
  ]);

  const quoteList = (quotes ?? []) as unknown as Array<{ created_at: string; rfqs: { created_at: string } | { created_at: string }[] | null }>;
  const responseDays = quoteList
    .map((q) => {
      const rfq = Array.isArray(q.rfqs) ? q.rfqs[0] : q.rfqs;
      if (!rfq?.created_at) return null;
      return (new Date(q.created_at).getTime() - new Date(rfq.created_at).getTime()) / (24 * 60 * 60 * 1000);
    })
    .filter((d): d is number => d != null && d >= 0);
  const avgResponseDays = responseDays.length > 0 ? Math.round((responseDays.reduce((a, b) => a + b, 0) / responseDays.length) * 10) / 10 : null;

  const poList = (pos ?? []) as Array<{ id: string; status: string }>;
  const fullyReceivedRate = poList.length > 0 ? poList.filter((p) => p.status === "fully_received" || p.status === "closed").length / poList.length : null;

  let fulfillmentRate: number | null = null;
  if (poList.length > 0) {
    const { data: lines } = await supabase
      .from("po_line_items")
      .select("qty, received_qty")
      .in("po_id", poList.map((p) => p.id));
    const lineList = (lines ?? []) as Array<{ qty: number; received_qty: number }>;
    const totalQty = lineList.reduce((sum, l) => sum + l.qty, 0);
    const totalReceived = lineList.reduce((sum, l) => sum + Math.min(l.received_qty, l.qty), 0);
    fulfillmentRate = totalQty > 0 ? totalReceived / totalQty : null;
  }

  return {
    quoteCount: quoteList.length,
    avgResponseDays,
    poCount: poList.length,
    fullyReceivedRate,
    fulfillmentRate,
  };
}
