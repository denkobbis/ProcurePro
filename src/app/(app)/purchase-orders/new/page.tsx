import { notFound } from "next/navigation";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { convertToPo } from "@/app/actions/po";
import LineItemsEditor from "@/components/LineItemsEditor";
import CurrencyFields from "@/components/CurrencyFields";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/Button";
import type { Vendor } from "@/lib/database.types";

export default async function NewPurchaseOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ request_id?: string }>;
}) {
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  const { request_id: requestId } = await searchParams;
  if (!requestId) notFound();

  const supabase = await createClient();
  const { data: request } = await supabase.from("requests").select("*").eq("id", requestId).single();
  if (!request || request.status !== "approved") notFound();

  const { data: vendors } = await supabase.from("vendors").select("*").eq("is_approved", true).order("name");

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader
        title="Create Purchase Order"
        description={`From request ${request.request_number}: ${request.description}`}
      />

      <form action={convertToPo} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <input type="hidden" name="request_id" value={request.id} />

        <div>
          <label className="block text-sm font-medium text-zinc-700">Vendor</label>
          <select name="vendor_id" required defaultValue={request.vendor_id ?? ""} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">Select a vendor...</option>
            {(vendors ?? []).map((v: Vendor) => (
              <option key={v.id} value={v.id}>
                {v.name} {v.ncdmb_compliant ? "· NCDMB compliant" : ""}
              </option>
            ))}
          </select>
          {(vendors ?? []).length === 0 && (
            <p className="mt-1 text-xs text-amber-600">No approved vendors yet — add one under Vendors first.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Delivery terms</label>
          <textarea name="delivery_terms" rows={2} placeholder="e.g. Deliver to Port Harcourt yard within 10 days" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">Currency &amp; landed cost</label>
          <CurrencyFields />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">Line items</label>
          <LineItemsEditor
            initialItems={[
              {
                description: request.description,
                qty: String(request.qty),
                unitPrice: String(request.est_unit_cost),
                mpn: request.mpn ?? "",
                oemBrand: request.oem_brand ?? "",
              },
            ]}
          />
          <p className="mt-2 text-xs text-zinc-400">
            Pre-filled from the request — edit to match the vendor&apos;s final quote, or add more lines.
          </p>
        </div>

        <Button type="submit" variant="success">
          Create Purchase Order
        </Button>
      </form>
    </div>
  );
}
