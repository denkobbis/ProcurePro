import Link from "next/link";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";
import type { PurchaseOrder, Vendor } from "@/lib/database.types";

export default async function PurchaseOrdersPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  const supabase = await createClient();
  const { data: pos } = await supabase.from("purchase_orders").select("*").order("created_at", { ascending: false });

  const vendorIds = [...new Set((pos ?? []).map((p: PurchaseOrder) => p.vendor_id))];
  const { data: vendors } = vendorIds.length
    ? await supabase.from("vendors").select("id, name").in("id", vendorIds)
    : { data: [] as Pick<Vendor, "id" | "name">[] };
  const vendorMap = new Map((vendors ?? []).map((v) => [v.id, v.name]));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-900">Purchase Orders</h1>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2">PO #</th>
              <th className="px-4 py-2">Vendor</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {(pos ?? []).map((po: PurchaseOrder) => (
              <tr key={po.id} className="border-t border-zinc-100 hover:bg-zinc-50">
                <td className="px-4 py-2">
                  <Link href={`/purchase-orders/${po.id}`} className="font-medium text-zinc-900 hover:underline">
                    {po.po_number}
                  </Link>
                </td>
                <td className="px-4 py-2 text-zinc-700">{vendorMap.get(po.vendor_id) ?? "—"}</td>
                <td className="px-4 py-2 text-zinc-700">{formatNaira(po.total_amount)}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={po.status} />
                </td>
                <td className="px-4 py-2 text-zinc-500">{new Date(po.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {(pos ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                  No purchase orders yet. Convert an approved request to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
