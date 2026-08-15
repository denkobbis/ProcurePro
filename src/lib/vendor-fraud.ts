import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Finds other vendors in the same org whose bank account number matches this
 * one — a known payment-diversion pattern (same account under a different
 * company name). Advisory only: surfaced as a warning banner for a human to
 * review, never blocks payout setup or a payment automatically.
 */
export async function findVendorsSharingAccount(
  supabase: SupabaseClient,
  accountNumber: string,
  excludeVendorId: string
): Promise<Array<{ id: string; name: string }>> {
  if (!accountNumber) return [];
  const { data } = await supabase
    .from("vendors")
    .select("id, name")
    .eq("account_number", accountNumber)
    .neq("id", excludeVendorId);
  return (data ?? []) as Array<{ id: string; name: string }>;
}
