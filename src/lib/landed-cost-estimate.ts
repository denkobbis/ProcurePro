import type { SupabaseClient } from "@supabase/supabase-js";

export interface LandedCostEstimate {
  freightCostNgn: number;
  customsDutyNgn: number;
  basedOnCount: number;
}

const MIN_HISTORY = 2;

/**
 * Pre-fills freight/customs duty on a new PO from this org's own historical
 * average for the same request category — a starting point to edit, not a
 * quote. Returns null below MIN_HISTORY so a single outlier PO can't set a
 * misleading suggestion; actuals still get entered for real on receiving.
 */
export async function estimateLandedCost(supabase: SupabaseClient, category: string): Promise<LandedCostEstimate | null> {
  const { data } = await supabase
    .from("purchase_orders")
    .select("freight_cost_ngn, customs_duty_ngn, requests!inner(category)")
    .eq("requests.category", category);

  const rows = (data ?? []) as Array<{ freight_cost_ngn: number; customs_duty_ngn: number }>;
  if (rows.length < MIN_HISTORY) return null;

  const avgFreight = rows.reduce((sum, r) => sum + Number(r.freight_cost_ngn), 0) / rows.length;
  const avgDuty = rows.reduce((sum, r) => sum + Number(r.customs_duty_ngn), 0) / rows.length;

  return {
    freightCostNgn: Math.round(avgFreight),
    customsDutyNgn: Math.round(avgDuty),
    basedOnCount: rows.length,
  };
}
