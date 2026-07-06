import { notFound } from "next/navigation";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updatePo } from "@/app/actions/po";
import LineItemsEditor from "@/components/LineItemsEditor";
import type { PoLineItem, Vendor } from "@/lib/database.types";

export default async function EditPurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  const supabase = await createClient();
  const { data: po } = await supabase.from("purchase_orders").select("*").eq("id", id).single();
  if (!po) notFound();
  if (po.status !== "draft") notFound();

  const [{ data: vendors }, { data: lineItems }] = await Promise.all([
    supabase.from("vendors").select("*").eq("is_approved", true).order("name"),
    supabase.from("po_line_items").select("*").eq("po_id", id).order("created_at"),
  ]);

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Edit {po.po_number}</h1>
        <p className="text-sm text-zinc-500">Only draft purchase orders can be edited — changes are recorded in the audit log.</p>
      </div>

      <form action={updatePo} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
        <input type="hidden" name="po_id" value={po.id} />

        <div>
          <label className="block text-sm font-medium text-zinc-700">Vendor</label>
          <select name="vendor_id" required defaultValue={po.vendor_id} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
            {(vendors ?? []).map((v: Vendor) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Delivery terms</label>
          <textarea
            name="delivery_terms"
            rows={2}
            defaultValue={po.delivery_terms ?? ""}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">Line items</label>
          <LineItemsEditor
            initialItems={(lineItems ?? []).map((li: PoLineItem) => ({
              description: li.description,
              qty: String(li.qty),
              unitPrice: String(li.unit_price),
            }))}
          />
        </div>

        <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
          Save changes
        </button>
      </form>
    </div>
  );
}
