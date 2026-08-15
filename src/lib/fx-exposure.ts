import { getCurrentRateToNgn } from "@/lib/fx-rate";
import type { PurchaseOrder } from "@/lib/database.types";

export interface FxExposureFlag {
  poId: string;
  poNumber: string;
  currency: string;
  originalRate: number;
  currentRate: number;
  percentChange: number;
  ngnImpact: number;
}

const MATERIAL_THRESHOLD_PERCENT = 5;

/**
 * Flags open, unpaid, non-NGN POs where the Naira has moved materially
 * since the PO's own recorded fx_rate_to_ngn — a heads-up for budget owners,
 * not a hedging or trading tool. Advisory only; never blocks anything.
 */
export async function checkFxExposure(purchaseOrders: PurchaseOrder[]): Promise<FxExposureFlag[]> {
  const openForeign = purchaseOrders.filter(
    (po) => po.currency !== "NGN" && po.payment_status !== "paid" && po.status !== "closed" && po.fx_rate_to_ngn > 0
  );
  if (openForeign.length === 0) return [];

  const currencies = [...new Set(openForeign.map((po) => po.currency))];
  const rateEntries = await Promise.all(currencies.map(async (c) => [c, await getCurrentRateToNgn(c)] as const));
  const rates = new Map(rateEntries);

  const flags: FxExposureFlag[] = [];
  for (const po of openForeign) {
    const currentRate = rates.get(po.currency);
    if (!currentRate) continue;
    const percentChange = (currentRate / po.fx_rate_to_ngn - 1) * 100;
    if (Math.abs(percentChange) < MATERIAL_THRESHOLD_PERCENT) continue;
    flags.push({
      poId: po.id,
      poNumber: po.po_number,
      currency: po.currency,
      originalRate: po.fx_rate_to_ngn,
      currentRate,
      percentChange: Math.round(percentChange),
      ngnImpact: Math.round(po.total_amount * (currentRate - po.fx_rate_to_ngn)),
    });
  }
  return flags;
}
