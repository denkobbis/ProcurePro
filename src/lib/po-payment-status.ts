import type { createAdminClient } from "@/lib/supabase/server";

// Called after a payment attempt settles (success or failure) — POs can be
// paid in stages, so neither outcome necessarily determines the PO's overall
// status on its own: a failed attempt after an earlier partial success should
// leave the PO at "partially_paid", not regress it to "failed".
// zeroPaidStatus is what to fall back to when nothing has ever succeeded yet
// — "unpaid" if this is just a routine recompute, "failed" right after this
// specific attempt failed.
export async function recomputePoPaymentStatus(
  supabase: ReturnType<typeof createAdminClient>,
  poId: string,
  zeroPaidStatus: "unpaid" | "failed" = "unpaid"
) {
  const { data: po } = await supabase.from("purchase_orders").select("total_amount_ngn").eq("id", poId).single();
  if (!po) return;

  const { data: payments } = await supabase.from("payments").select("amount").eq("purchase_order_id", poId).eq("status", "success");
  const amountPaid = (payments ?? []).reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0);

  const status = amountPaid >= po.total_amount_ngn ? "paid" : amountPaid > 0 ? "partially_paid" : zeroPaidStatus;
  await supabase.from("purchase_orders").update({ payment_status: status }).eq("id", poId);
}
