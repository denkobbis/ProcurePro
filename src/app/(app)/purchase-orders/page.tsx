import Link from "next/link";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import EmptyState from "@/components/EmptyState";
import { CartIcon } from "@/components/icons";
import { checkFxExposure } from "@/lib/fx-exposure";
import PurchaseOrdersTable, { type PoRow } from "./PurchaseOrdersTable";
import type { PurchaseOrder, Vendor, PurchaseRequest } from "@/lib/database.types";

function daysSince(iso: string): number {
  return Math.round((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

export default async function PurchaseOrdersPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  const supabase = await createClient();
  const { data: pos } = await supabase.from("purchase_orders").select("*").order("created_at", { ascending: false });
  const rows = (pos ?? []) as PurchaseOrder[];

  const vendorIds = [...new Set(rows.map((p) => p.vendor_id))];
  const requestIds = [...new Set(rows.map((p) => p.request_id).filter((id): id is string => !!id))];
  const [{ data: vendors }, { data: requests }] = await Promise.all([
    vendorIds.length ? supabase.from("vendors").select("id, name").in("id", vendorIds) : Promise.resolve({ data: [] as Pick<Vendor, "id" | "name">[] }),
    requestIds.length ? supabase.from("requests").select("id, description").in("id", requestIds) : Promise.resolve({ data: [] as Pick<PurchaseRequest, "id" | "description">[] }),
  ]);
  const vendorMap = new Map((vendors ?? []).map((v) => [v.id, v.name]));
  const requestMap = new Map((requests ?? []).map((r) => [r.id, r.description]));

  const fxFlags = await checkFxExposure(rows);
  const fxIds = new Set(fxFlags.map((f) => f.poId));

  const tableRows: PoRow[] = rows.map((po) => ({
    id: po.id,
    poNumber: po.po_number,
    title: (po.request_id && requestMap.get(po.request_id)) || `Order with ${vendorMap.get(po.vendor_id) ?? "vendor"}`,
    vendorName: vendorMap.get(po.vendor_id) ?? "—",
    status: po.status,
    landedCostLabel: formatNaira(po.total_amount_ngn + po.freight_cost_ngn + po.customs_duty_ngn),
    ageDays: daysSince(po.created_at),
    fxFlagged: fxIds.has(po.id),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[38px] font-semibold leading-none tracking-tight text-zinc-900 dark:text-zinc-100">Purchase orders</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Every order raised, from draft through receiving.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/invoices/export" className="text-sm font-medium text-zinc-500 hover:text-brand-700 hover:underline dark:text-zinc-400 dark:hover:text-brand-400">
            Export invoices (Xero)
          </Link>
          <Link href="/purchase-orders/export" className="text-sm font-medium text-zinc-500 hover:text-brand-700 hover:underline dark:text-zinc-400 dark:hover:text-brand-400">
            Export CSV
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <EmptyState
            icon={<CartIcon />}
            title="No purchase orders yet"
            description="Convert an approved request to create one, or award a winning RFQ quote."
          />
        </div>
      ) : (
        <PurchaseOrdersTable rows={tableRows} />
      )}
    </div>
  );
}
