"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, PROCUREMENT_ROLES } from "@/lib/auth";
import { notifyPoSent, notifyItemsReceived } from "@/lib/notify";

function parseLineItems(formData: FormData) {
  const descriptions = formData.getAll("line_description") as string[];
  const qtys = formData.getAll("line_qty") as string[];
  const unitPrices = formData.getAll("line_unit_price") as string[];

  return descriptions
    .map((description, i) => ({
      description: description.trim(),
      qty: Number(qtys[i] ?? 0),
      unit_price: Number(unitPrices[i] ?? 0),
    }))
    .filter((item) => item.description && item.qty > 0);
}

export async function convertToPo(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!PROCUREMENT_ROLES.includes(profile.role)) throw new Error("Not authorized");

  const requestId = String(formData.get("request_id") ?? "");
  const vendorId = String(formData.get("vendor_id") ?? "");
  const deliveryTerms = String(formData.get("delivery_terms") ?? "").trim() || null;

  if (!vendorId) throw new Error("Select a vendor");

  const lineItems = parseLineItems(formData);
  if (lineItems.length === 0) throw new Error("Add at least one line item");

  const supabase = await createClient();
  const { data: poId, error } = await supabase.rpc("convert_to_po", {
    p_request_id: requestId,
    p_vendor_id: vendorId,
    p_delivery_terms: deliveryTerms,
    p_line_items: lineItems,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/purchase-orders");
  revalidatePath(`/requests/${requestId}`);
  redirect(`/purchase-orders/${poId}`);
}

export async function updatePo(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!PROCUREMENT_ROLES.includes(profile.role)) throw new Error("Not authorized");

  const poId = String(formData.get("po_id") ?? "");
  const vendorId = String(formData.get("vendor_id") ?? "");
  const deliveryTerms = String(formData.get("delivery_terms") ?? "").trim() || null;

  if (!vendorId) throw new Error("Select a vendor");

  const lineItems = parseLineItems(formData);
  if (lineItems.length === 0) throw new Error("Add at least one line item");

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_po", {
    p_po_id: poId,
    p_vendor_id: vendorId,
    p_delivery_terms: deliveryTerms,
    p_line_items: lineItems,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/purchase-orders/${poId}`);
  redirect(`/purchase-orders/${poId}`);
}

export async function markPoSent(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!PROCUREMENT_ROLES.includes(profile.role)) throw new Error("Not authorized");

  const poId = String(formData.get("po_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("purchase_orders").update({ status: "sent_to_vendor" }).eq("id", poId);
  if (error) throw new Error(error.message);

  await notifyPoSent(supabase, poId);

  revalidatePath(`/purchase-orders/${poId}`);
}

export async function closePo(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!PROCUREMENT_ROLES.includes(profile.role)) throw new Error("Not authorized");

  const poId = String(formData.get("po_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("purchase_orders").update({ status: "closed" }).eq("id", poId);
  if (error) throw new Error(error.message);

  revalidatePath(`/purchase-orders/${poId}`);
}

export async function receivePoLine(formData: FormData) {
  const poId = String(formData.get("po_id") ?? "");
  const lineItemId = String(formData.get("line_item_id") ?? "");
  const receivedQty = Number(formData.get("received_qty") ?? 0);
  const qualityPass = formData.get("quality_pass") === "on";

  if (receivedQty <= 0) throw new Error("Enter a received quantity greater than 0");

  const supabase = await createClient();

  const { data: lineItem } = await supabase.from("po_line_items").select("description").eq("id", lineItemId).single();

  const { error } = await supabase.rpc("receive_po_line", {
    p_line_item_id: lineItemId,
    p_received_qty: receivedQty,
    p_quality_pass: qualityPass,
  });
  if (error) throw new Error(error.message);

  if (lineItem) {
    await notifyItemsReceived(supabase, poId, lineItem.description, receivedQty);
  }

  revalidatePath(`/purchase-orders/${poId}`);
}
