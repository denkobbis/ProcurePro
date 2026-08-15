import type { SupabaseClient } from "@supabase/supabase-js";

export interface PoAnomalyFlags {
  possibleDuplicates: Array<{ id: string; po_number: string }>;
  priceJump: { historicalAvgNgn: number; percentAbove: number } | null;
}

interface PoForAnomalyCheck {
  id: string;
  vendor_id: string;
  total_amount_ngn: number;
  created_at: string;
}

export const DUPLICATE_WINDOW_DAYS = 30;
const PRICE_JUMP_MULTIPLIER = 2;
const MIN_HISTORY_FOR_PRICE_CHECK = 2;

/**
 * Advisory-only checks run before a payout: likely-duplicate POs (same
 * vendor, same amount, opened close together) and unusual price jumps vs.
 * that vendor's own history. Never blocks payment — flags for a human to
 * glance at before clicking pay, same as vendor account-sharing checks.
 */
export async function checkPoAnomalies(supabase: SupabaseClient, po: PoForAnomalyCheck): Promise<PoAnomalyFlags> {
  const { data } = await supabase
    .from("purchase_orders")
    .select("id, po_number, total_amount_ngn, created_at")
    .eq("vendor_id", po.vendor_id)
    .neq("id", po.id);

  const others = (data ?? []) as Array<{ id: string; po_number: string; total_amount_ngn: number; created_at: string }>;
  const createdAt = new Date(po.created_at).getTime();
  const windowMs = DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const possibleDuplicates = others
    .filter((p) => Math.abs(p.total_amount_ngn - po.total_amount_ngn) < 1 && Math.abs(new Date(p.created_at).getTime() - createdAt) <= windowMs)
    .map((p) => ({ id: p.id, po_number: p.po_number }));

  let priceJump: PoAnomalyFlags["priceJump"] = null;
  if (others.length >= MIN_HISTORY_FOR_PRICE_CHECK) {
    const avg = others.reduce((sum, p) => sum + p.total_amount_ngn, 0) / others.length;
    if (avg > 0 && po.total_amount_ngn > avg * PRICE_JUMP_MULTIPLIER) {
      priceJump = { historicalAvgNgn: Math.round(avg), percentAbove: Math.round((po.total_amount_ngn / avg - 1) * 100) };
    }
  }

  return { possibleDuplicates, priceJump };
}
