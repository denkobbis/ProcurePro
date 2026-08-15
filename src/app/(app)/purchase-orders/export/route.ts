import { NextResponse } from "next/server";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsvGeneric, csvResponse } from "@/lib/csv";
import type { PurchaseOrder, Vendor } from "@/lib/database.types";

export async function GET() {
  const profile = await getCurrentProfile();
  try {
    requireRole(profile, PROCUREMENT_ROLES);
  } catch {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: pos } = await supabase.from("purchase_orders").select("*").order("created_at", { ascending: false });
  const rows = (pos ?? []) as PurchaseOrder[];

  const vendorIds = [...new Set(rows.map((p) => p.vendor_id))];
  const { data: vendors } = vendorIds.length
    ? await supabase.from("vendors").select("id, name").in("id", vendorIds)
    : { data: [] as Pick<Vendor, "id" | "name">[] };
  const vendorMap = new Map((vendors ?? []).map((v) => [v.id, v.name]));

  const csv = toCsvGeneric(rows, [
    { key: "po_number", header: "PO #" },
    { key: "vendor_id", header: "Vendor", format: (v) => vendorMap.get(v as string) ?? "" },
    { key: "status", header: "Status" },
    { key: "currency", header: "Currency" },
    { key: "total_amount", header: "Total Amount" },
    { key: "total_amount_ngn", header: "Total Amount (NGN)" },
    { key: "freight_cost_ngn", header: "Freight Cost (NGN)" },
    { key: "customs_duty_ngn", header: "Customs Duty (NGN)" },
    { key: "payment_status", header: "Payment Status" },
    { key: "delivery_terms", header: "Delivery Terms" },
    { key: "carrier", header: "Carrier" },
    { key: "tracking_number", header: "Tracking #" },
    { key: "eta", header: "ETA" },
    { key: "customs_reference", header: "Customs Reference" },
    { key: "customs_cleared_at", header: "Customs Cleared" },
    { key: "created_at", header: "Created" },
  ]);

  return csvResponse(csv, "purchase-orders.csv");
}
