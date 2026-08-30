"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, ADMIN_ROLES, PROCUREMENT_ROLES, requireActiveOrg } from "@/lib/auth";
import * as paystack from "@/lib/paystack";
import * as flutterwave from "@/lib/flutterwave";
import { recomputePoPaymentStatus } from "@/lib/po-payment-status";
import type { PaymentProvider } from "@/lib/database.types";

async function writeAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entityType: string,
  entityId: string,
  action: string,
  details: Record<string, unknown>
) {
  await supabase.rpc("write_audit", { p_entity_type: entityType, p_entity_id: entityId, p_action: action, p_details: details });
}

// Resolves the account name via Paystack (used as the single source of truth
// for verification regardless of which provider later pays the vendor — it's
// the same real-world bank account either way) and saves it to the vendor.
// Also creates the Paystack transfer recipient now, so a later Paystack
// payment doesn't need to re-verify.
export async function updateVendorPayout(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!PROCUREMENT_ROLES.includes(profile.role)) throw new Error("Not authorized");
  await requireActiveOrg(profile);

  const vendorId = String(formData.get("vendor_id") ?? "");
  const bankName = String(formData.get("bank_name") ?? "").trim();
  const paystackBankCode = String(formData.get("paystack_bank_code") ?? "").trim();
  const accountNumber = String(formData.get("account_number") ?? "").trim();

  if (!vendorId || !bankName || !paystackBankCode || !accountNumber) {
    throw new Error("Select a bank and enter the account number");
  }

  const resolved = await paystack.resolveAccountNumber(accountNumber, paystackBankCode);
  const recipient = await paystack.createTransferRecipient({
    name: resolved.account_name,
    accountNumber,
    bankCode: paystackBankCode,
  });

  // Best-effort: cache the matching Flutterwave bank code now so a Flutterwave
  // payment later doesn't need a fragile live name-match against their bank
  // list every time. Not fatal if Flutterwave is unreachable or has no exact
  // name match — initiatePayment falls back to the live match in that case.
  let flutterwaveBankCode: string | null = null;
  try {
    const flutterwaveBanks = await flutterwave.listBanks();
    flutterwaveBankCode = flutterwaveBanks.find((b) => b.name.toLowerCase() === bankName.toLowerCase())?.code ?? null;
  } catch {
    flutterwaveBankCode = null;
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_vendor_payout", {
    p_vendor_id: vendorId,
    p_bank_name: bankName,
    p_account_number: accountNumber,
    p_account_name: resolved.account_name,
    p_paystack_recipient_code: recipient.recipient_code,
    p_flutterwave_bank_code: flutterwaveBankCode,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/vendors/${vendorId}`);
}

// Amount already successfully paid out for a PO, across all payment attempts
// — payments are per-attempt audit rows, not a single mutable total.
async function getAmountPaid(supabase: Awaited<ReturnType<typeof createClient>>, poId: string): Promise<number> {
  const { data } = await supabase.from("payments").select("amount").eq("purchase_order_id", poId).eq("status", "success");
  return (data ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
}

// Pays the vendor against the PO's line-item value (total_amount_ngn) — freight
// and customs duty are logistics costs, not owed to the vendor, so they're
// deliberately excluded from the payable amount. Supports paying in stages:
// defaults to the full remaining balance, but a smaller amount can be given.
export async function initiatePayment(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!ADMIN_ROLES.includes(profile.role)) throw new Error("Only finance/admin can initiate a payment");
  await requireActiveOrg(profile);

  const poId = String(formData.get("po_id") ?? "");
  const provider = String(formData.get("provider") ?? "") as PaymentProvider;
  if (provider !== "paystack" && provider !== "flutterwave") throw new Error("Invalid payment provider");

  const supabase = await createClient();
  const { data: po } = await supabase.from("purchase_orders").select("*").eq("id", poId).single();
  if (!po) throw new Error("Purchase order not found");
  if (po.payment_status === "paid" || po.payment_status === "processing") {
    throw new Error(`This PO is already ${po.payment_status}`);
  }

  const { data: vendor } = await supabase.from("vendors").select("*").eq("id", po.vendor_id).single();
  if (!vendor) throw new Error("Vendor not found");
  if (!vendor.bank_name || !vendor.account_number || !vendor.account_name) {
    throw new Error("This vendor has no payout details on file yet — add them on the vendor page first");
  }

  const amountPaid = await getAmountPaid(supabase, poId);
  const remaining = po.total_amount_ngn - amountPaid;
  if (remaining <= 0) throw new Error("This PO is already fully paid");

  const requestedRaw = String(formData.get("amount") ?? "").trim();
  const amountNaira = requestedRaw ? Number(requestedRaw) : remaining;
  if (!Number.isFinite(amountNaira) || amountNaira <= 0) throw new Error("Enter a valid amount");
  if (amountNaira > remaining) throw new Error(`Amount exceeds the remaining balance of ₦${remaining.toLocaleString()}`);

  // Atomic claim: flips payment_status to "processing" in the same statement
  // that checks it isn't already paid/processing, so two near-simultaneous
  // clicks (or a retried request) can't both pass — Postgres serializes
  // concurrent UPDATEs on the same row, so only one of them can match this
  // WHERE clause. Everything above this point is read-only validation; the
  // actual provider call only happens after this claim succeeds.
  const { data: claimedPo, error: claimErr } = await supabase
    .from("purchase_orders")
    .update({ payment_status: "processing" })
    .eq("id", poId)
    .not("payment_status", "in", "(paid,processing)")
    .select()
    .maybeSingle();
  if (claimErr) throw new Error(claimErr.message);
  if (!claimedPo) throw new Error("This PO already has a payment in progress or is already paid");

  const reference = `PAY-${po.po_number}-${Date.now()}`;

  const { data: payment, error: insertErr } = await supabase
    .from("payments")
    .insert({
      purchase_order_id: poId,
      provider,
      amount: amountNaira,
      currency: "NGN",
      status: "pending",
      provider_reference: reference,
      initiated_by: profile.id,
    })
    .select()
    .single();
  if (insertErr) {
    await recomputePoPaymentStatus(supabase, poId);
    throw new Error(insertErr.message);
  }

  try {
    if (provider === "paystack") {
      if (!vendor.paystack_recipient_code) {
        throw new Error("This vendor has no Paystack recipient on file — re-save its payout details");
      }
      const transfer = await paystack.initiateTransfer({
        recipientCode: vendor.paystack_recipient_code,
        amountNaira,
        reason: `Payment for ${po.po_number}`,
        reference,
      });
      await supabase
        .from("payments")
        .update({ provider_reference: transfer.transfer_code, provider_recipient_code: vendor.paystack_recipient_code })
        .eq("id", payment.id);
    } else {
      let bankCode = vendor.flutterwave_bank_code;
      if (!bankCode) {
        const banks = await flutterwave.listBanks();
        bankCode = banks.find((b) => b.name.toLowerCase() === vendor.bank_name!.toLowerCase())?.code ?? null;
      }
      if (!bankCode) {
        throw new Error(`Could not find "${vendor.bank_name}" in Flutterwave's bank list — try Paystack instead, or check the bank name`);
      }
      const transfer = await flutterwave.initiateTransfer({
        bankCode,
        accountNumber: vendor.account_number,
        amountNaira,
        beneficiaryName: vendor.account_name,
        narration: `Payment for ${po.po_number}`,
        reference,
      });
      await supabase.from("payments").update({ provider_reference: String(transfer.id) }).eq("id", payment.id);
    }

    await writeAudit(supabase, "payment", payment.id, "initiated", { provider, amount: amountNaira, reference });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await supabase.from("payments").update({ status: "failed", failure_reason: message }).eq("id", payment.id);
    await recomputePoPaymentStatus(supabase, poId, "failed");
    await writeAudit(supabase, "payment", payment.id, "failed", { provider, reason: message });
    throw new Error(message);
  }

  revalidatePath(`/purchase-orders/${poId}`);
}

// Only needed if Paystack's account has OTP-gated transfers enabled — see
// lib/paystack.ts finalizeTransfer(). Harmless to attempt otherwise; Paystack
// just rejects it with a clear error if no OTP was actually pending.
export async function finalizePaystackPayment(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!ADMIN_ROLES.includes(profile.role)) throw new Error("Only finance/admin can finalize a payment");
  await requireActiveOrg(profile);

  const paymentId = String(formData.get("payment_id") ?? "");
  const otp = String(formData.get("otp") ?? "").trim();
  if (!otp) throw new Error("Enter the OTP sent to your Paystack account");

  const supabase = await createClient();
  const { data: payment } = await supabase.from("payments").select("*").eq("id", paymentId).single();
  if (!payment || !payment.provider_reference) throw new Error("Payment not found");

  try {
    await paystack.finalizeTransfer(payment.provider_reference, otp);
    await writeAudit(supabase, "payment", payment.id, "otp_finalized", {});
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    throw new Error(message);
  }

  revalidatePath(`/purchase-orders/${payment.purchase_order_id}`);
}
