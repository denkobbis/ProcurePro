import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsvGeneric, csvResponse } from "@/lib/csv";
import type { Invoice, InvoiceLineItem, Vendor, PurchaseOrder } from "@/lib/database.types";

// One row per invoice line item, in Xero's documented "Bills you need to pay"
// import format (https://central.xero.com/s/article/Import-bills-into-Xero) —
// AccountCode and TaxType are left blank since those map to each
// organization's own chart of accounts/tax rates, which this app has no way
// to know; Xero's import screen lets you set both as a bulk default or map
// them per row before completing the import.
interface InvoiceExportRow {
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  description: string;
  qty: number;
  unitAmount: number;
  currency: string;
  poNumber: string;
}

export async function GET() {
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);
  const supabase = await createClient();

  const { data: invoices } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
  const rows = (invoices ?? []) as Invoice[];

  const invoiceIds = rows.map((inv) => inv.id);
  const vendorIds = [...new Set(rows.map((inv) => inv.vendor_id))];
  const poIds = [...new Set(rows.map((inv) => inv.po_id))];

  const [{ data: lines }, { data: vendors }, { data: pos }] = await Promise.all([
    invoiceIds.length ? supabase.from("invoice_line_items").select("*").in("invoice_id", invoiceIds) : Promise.resolve({ data: [] as InvoiceLineItem[] }),
    vendorIds.length ? supabase.from("vendors").select("id, name").in("id", vendorIds) : Promise.resolve({ data: [] as Pick<Vendor, "id" | "name">[] }),
    poIds.length ? supabase.from("purchase_orders").select("id, po_number").in("id", poIds) : Promise.resolve({ data: [] as Pick<PurchaseOrder, "id" | "po_number">[] }),
  ]);

  const vendorMap = new Map((vendors ?? []).map((v) => [v.id, v.name]));
  const poMap = new Map((pos ?? []).map((p) => [p.id, p.po_number]));
  const linesByInvoice = new Map<string, InvoiceLineItem[]>();
  for (const l of (lines ?? []) as InvoiceLineItem[]) {
    linesByInvoice.set(l.invoice_id, [...(linesByInvoice.get(l.invoice_id) ?? []), l]);
  }

  const exportRows: InvoiceExportRow[] = rows.flatMap((inv) =>
    (linesByInvoice.get(inv.id) ?? []).map((line) => ({
      vendorName: vendorMap.get(inv.vendor_id) ?? "",
      invoiceNumber: inv.invoice_number,
      invoiceDate: inv.invoice_date ?? inv.created_at.slice(0, 10),
      description: `${line.description}${poMap.get(inv.po_id) ? ` (${poMap.get(inv.po_id)})` : ""}`,
      qty: line.qty,
      unitAmount: line.unit_price,
      currency: inv.currency,
      poNumber: poMap.get(inv.po_id) ?? "",
    }))
  );

  const csv = toCsvGeneric(exportRows, [
    { key: "vendorName", header: "*ContactName" },
    { key: "invoiceNumber", header: "*InvoiceNumber" },
    { key: "invoiceDate", header: "*InvoiceDate" },
    { key: "invoiceDate", header: "*DueDate" },
    { key: "description", header: "*Description" },
    { key: "qty", header: "*Quantity" },
    { key: "unitAmount", header: "*UnitAmount" },
    { key: "vendorName", header: "AccountCode", format: () => "" },
    { key: "vendorName", header: "TaxType", format: () => "" },
    { key: "currency", header: "Currency" },
    { key: "poNumber", header: "Reference" },
  ]);

  return csvResponse(csv, "invoices-xero-bills.csv");
}
