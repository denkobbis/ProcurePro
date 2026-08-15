import Link from "next/link";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { CartIcon, SparkleIcon } from "@/components/icons";
import { formatNaira } from "@/lib/money";
import { checkFxExposure } from "@/lib/fx-exposure";
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
  const rows = pos ?? [];
  const fxFlags = await checkFxExposure(rows);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Purchase Orders"
        actions={
          <Link href="/purchase-orders/export" className="text-sm font-medium text-zinc-500 hover:text-brand-700 hover:underline">
            Export CSV
          </Link>
        }
      />

      {fxFlags.length > 0 && (
        <div className="space-y-1.5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex items-center gap-1.5 font-medium">
            <SparkleIcon className="h-4 w-4 shrink-0 text-amber-600" />
            NGN has moved since these open POs were raised
          </div>
          <ul className="space-y-0.5 pl-5 text-xs">
            {fxFlags.map((f) => (
              <li key={f.poId} className="list-disc">
                <Link href={`/purchase-orders/${f.poId}`} className="underline">{f.poNumber}</Link>: {f.currency} is{" "}
                {f.percentChange > 0 ? "up" : "down"} {Math.abs(f.percentChange)}% vs. this PO&apos;s rate — landed cost is now
                roughly {f.ngnImpact >= 0 ? "" : "-"}{formatNaira(Math.abs(f.ngnImpact))} {f.ngnImpact >= 0 ? "more" : "less"} in NGN.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <EmptyState
            icon={<CartIcon />}
            title="No purchase orders yet"
            description="Convert an approved request to create one, or award a winning RFQ quote."
          />
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/70 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">PO #</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((po: PurchaseOrder) => (
                <tr key={po.id} className="transition-colors hover:bg-brand-50/40">
                  <td className="px-4 py-3">
                    <Link href={`/purchase-orders/${po.id}`} className="font-medium text-brand-700 hover:underline">
                      {po.po_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{vendorMap.get(po.vendor_id) ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-700">{formatMoney(po.total_amount, po.currency)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={po.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(po.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
