"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, PROCUREMENT_ROLES, requireActiveOrg } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { matchInvoiceToPo } from "@/lib/invoice-match";
import type { PoLineItem } from "@/lib/database.types";

const MAX_LINE_ITEMS = 200;

function parseInvoiceLineItems(formData: FormData) {
  const descriptions = formData.getAll("line_description") as string[];
  if (descriptions.length > MAX_LINE_ITEMS) throw new Error(`An invoice can have at most ${MAX_LINE_ITEMS} line items`);
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

export async function recordInvoice(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!PROCUREMENT_ROLES.includes(profile.role)) throw new Error("Not authorized");
  await requireActiveOrg(profile);

  const poId = String(formData.get("po_id") ?? "");
  const invoiceNumber = String(formData.get("invoice_number") ?? "").trim();
  const invoiceDate = String(formData.get("invoice_date") ?? "") || null;
  const currency = String(formData.get("currency") ?? "NGN");
  const totalAmount = Number(formData.get("total_amount") ?? 0);
  const file = formData.get("attachment") as File | null;

  if (!invoiceNumber) throw new Error("Enter the invoice number");
  const lineItems = parseInvoiceLineItems(formData);
  if (lineItems.length === 0) throw new Error("Add at least one line item");

  // Catches a typo'd total or a line item that didn't get entered — 1% covers
  // rounding, not a real mismatch.
  const lineItemsTotal = lineItems.reduce((sum, l) => sum + l.qty * l.unit_price, 0);
  if (Math.abs(totalAmount - lineItemsTotal) > Math.max(1, totalAmount * 0.01)) {
    throw new Error(
      `Invoice total (${formatMoney(totalAmount, currency)}) doesn't match the line items (${formatMoney(lineItemsTotal, currency)}) — check for a missing or mistyped line.`
    );
  }

  const supabase = await createClient();
  const { data: po, error: poErr } = await supabase.from("purchase_orders").select("id, vendor_id, currency").eq("id", poId).single();
  if (poErr || !po) throw new Error("Purchase order not found");

  let filePath: string | null = null;
  let fileName: string | null = null;
  if (file && file.size > 0) {
    filePath = `purchase_orders/${poId}/invoices/${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("attachments").upload(filePath, file);
    if (uploadErr) throw new Error(uploadErr.message);
    fileName = file.name;
  }

  const { data: poLineItems } = await supabase.from("po_line_items").select("*").eq("po_id", poId);
  const match = matchInvoiceToPo(
    lineItems.map((l, i) => ({ id: `pending-${i}`, invoice_id: "pending", ...l, po_line_item_id: null, created_at: "" })),
    (poLineItems ?? []) as PoLineItem[],
    currency,
    po.currency
  );

  const { data: invoice, error: insertErr } = await supabase
    .from("invoices")
    .insert({
      po_id: poId,
      vendor_id: po.vendor_id,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      currency,
      total_amount: totalAmount,
      file_path: filePath,
      file_name: fileName,
      status: match.hasIssues ? "variance" : "matched",
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (insertErr) throw new Error(insertErr.message);

  const { error: lineErr } = await supabase.from("invoice_line_items").insert(
    lineItems.map((l) => ({
      invoice_id: invoice.id,
      description: l.description,
      qty: l.qty,
      unit_price: l.unit_price,
    }))
  );
  if (lineErr) {
    // No multi-table transaction available via the JS client — compensate by
    // deleting the invoice row rather than leaving an orphaned invoice with
    // no line items behind.
    await supabase.from("invoices").delete().eq("id", invoice.id);
    throw new Error(lineErr.message);
  }

  revalidatePath(`/purchase-orders/${poId}`);
}
