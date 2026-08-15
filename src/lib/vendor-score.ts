import type { SupabaseClient } from "@supabase/supabase-js";

export interface VendorScorecard {
  quoteCount: number;
  avgResponseDays: number | null;
  poCount: number;
  fullyReceivedRate: number | null;
  fulfillmentRate: number | null;
}

const EMPTY: VendorScorecard = { quoteCount: 0, avgResponseDays: null, poCount: 0, fullyReceivedRate: null, fulfillmentRate: null };

function round1(n: number | null): number | null {
  return n == null ? null : Math.round(n * 10) / 10;
}

// Postgres `numeric` columns come back from the Supabase client as strings
// (to avoid float precision loss) — the view's rate columns are numeric.
function toNumber(n: number | string | null): number | null {
  return n == null ? null : Number(n);
}

/**
 * Computed from data ProcurePro already records (RFQ quotes, PO status,
 * line-item receiving) — no LLM involved, every number here is a plain
 * aggregate a user could reproduce by hand from the same tables. The
 * aggregation itself runs in Postgres via v_vendor_scorecard (see migration
 * 0029) rather than pulling every quote/PO/line-item row into JS per render.
 */
export async function getVendorScorecard(supabase: SupabaseClient, vendorId: string): Promise<VendorScorecard> {
  const { data } = await supabase.from("v_vendor_scorecard").select("*").eq("vendor_id", vendorId).maybeSingle();
  if (!data) return EMPTY;

  return {
    quoteCount: data.quote_count,
    avgResponseDays: round1(toNumber(data.avg_response_days)),
    poCount: data.po_count,
    fullyReceivedRate: toNumber(data.fully_received_rate),
    fulfillmentRate: toNumber(data.fulfillment_rate),
  };
}
