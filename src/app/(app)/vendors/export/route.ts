import { NextResponse } from "next/server";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsvGeneric, csvResponse } from "@/lib/csv";
import type { Vendor } from "@/lib/database.types";

export async function GET() {
  const profile = await getCurrentProfile();
  try {
    requireRole(profile, PROCUREMENT_ROLES);
  } catch {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: vendors } = await supabase.from("vendors").select("*").order("name");
  const rows = (vendors ?? []) as Vendor[];

  // Deliberately excludes bank_details/account_number/recipient codes — a CSV
  // is easy to forward or drop in a shared drive, and this is business
  // contact/compliance data, not a payout export.
  const csv = toCsvGeneric(rows, [
    { key: "name", header: "Name" },
    { key: "category", header: "Category" },
    { key: "contact_email", header: "Contact Email" },
    { key: "contact_phone", header: "Contact Phone" },
    { key: "payment_terms", header: "Payment Terms" },
    { key: "default_currency", header: "Currency" },
    { key: "is_approved", header: "Approved", format: (v) => (v ? "Yes" : "No") },
    { key: "ncdmb_compliant", header: "NCDMB Compliant", format: (v) => (v ? "Yes" : "No") },
    { key: "ncdmb_certificate_number", header: "NCDMB Certificate #" },
    { key: "ncdmb_certificate_expiry", header: "NCDMB Certificate Expiry" },
    { key: "local_content_percentage", header: "Local Content %" },
    { key: "performance_notes", header: "Performance Notes" },
    { key: "created_at", header: "Created" },
  ]);

  return csvResponse(csv, "vendors.csv");
}
