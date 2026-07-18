"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, PROCUREMENT_ROLES } from "@/lib/auth";

export async function createRfq(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!PROCUREMENT_ROLES.includes(profile.role)) throw new Error("Not authorized");

  const requestId = String(formData.get("request_id") ?? "");

  const supabase = await createClient();
  const { data: rfqId, error } = await supabase.rpc("create_rfq", { p_request_id: requestId });
  if (error) throw new Error(error.message);

  revalidatePath("/rfqs");
  revalidatePath(`/requests/${requestId}`);
  redirect(`/rfqs/${rfqId}`);
}

export async function addRfqQuote(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!PROCUREMENT_ROLES.includes(profile.role)) throw new Error("Not authorized");

  const rfqId = String(formData.get("rfq_id") ?? "");
  const vendorId = String(formData.get("vendor_id") ?? "");
  const unitPrice = Number(formData.get("unit_price") ?? 0);
  const currency = String(formData.get("currency") ?? "NGN");
  const leadTimeRaw = String(formData.get("lead_time_days") ?? "").trim();
  const leadTimeDays = leadTimeRaw ? Number(leadTimeRaw) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!vendorId || unitPrice <= 0) throw new Error("Select a vendor and enter a unit price");

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_rfq_quote", {
    p_rfq_id: rfqId,
    p_vendor_id: vendorId,
    p_unit_price: unitPrice,
    p_currency: currency,
    p_lead_time_days: leadTimeDays,
    p_notes: notes,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/rfqs/${rfqId}`);
}

export async function awardRfqQuote(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!PROCUREMENT_ROLES.includes(profile.role)) throw new Error("Not authorized");

  const quoteId = String(formData.get("quote_id") ?? "");
  const rfqId = String(formData.get("rfq_id") ?? "");
  const deliveryTerms = String(formData.get("delivery_terms") ?? "").trim() || null;
  const fxRate = Number(formData.get("fx_rate_to_ngn") ?? 1) || 1;
  const freightCost = Number(formData.get("freight_cost_ngn") ?? 0) || 0;
  const customsDuty = Number(formData.get("customs_duty_ngn") ?? 0) || 0;

  const supabase = await createClient();
  const { data: poId, error } = await supabase.rpc("award_rfq_quote", {
    p_quote_id: quoteId,
    p_delivery_terms: deliveryTerms,
    p_fx_rate_to_ngn: fxRate,
    p_freight_cost_ngn: freightCost,
    p_customs_duty_ngn: customsDuty,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/rfqs/${rfqId}`);
  revalidatePath("/purchase-orders");
  redirect(`/purchase-orders/${poId}`);
}
