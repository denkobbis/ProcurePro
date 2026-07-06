import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";
import PrintButton from "@/components/PrintButton";
import { markPoSent, closePo, receivePoLine } from "@/app/actions/po";
import type { PoLineItem } from "@/lib/database.types";

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  const supabase = await createClient();
  const { data: po } = await supabase.from("purchase_orders").select("*").eq("id", id).single();
  if (!po) notFound();

  const [{ data: lineItems }, { data: vendor }, { data: department }] = await Promise.all([
    supabase.from("po_line_items").select("*").eq("po_id", id).order("created_at"),
    supabase.from("vendors").select("*").eq("id", po.vendor_id).single(),
    supabase.from("departments").select("*").eq("id", po.department_id).single(),
  ]);

  const items = (lineItems ?? []) as PoLineItem[];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{po.po_number}</h1>
          <p className="text-sm text-zinc-500">{(department as { name?: string } | null)?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={po.status} />
          <PrintButton />
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Vendor</dt>
            <dd className="text-zinc-900">{(vendor as { name?: string } | null)?.name}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Total amount</dt>
            <dd className="font-medium text-zinc-900">{formatNaira(po.total_amount)}</dd>
          </div>
          {po.delivery_terms && (
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Delivery terms</dt>
              <dd className="text-zinc-900">{po.delivery_terms}</dd>
            </div>
          )}
        </dl>

        <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-zinc-200 text-left text-zinc-500">
            <tr>
              <th className="py-2">Description</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Line total</th>
              <th>Received</th>
            </tr>
          </thead>
          <tbody>
            {items.map((li) => (
              <tr key={li.id} className="border-b border-zinc-100">
                <td className="py-2">{li.description}</td>
                <td>{li.qty}</td>
                <td>{formatNaira(li.unit_price)}</td>
                <td>{formatNaira(li.qty * li.unit_price)}</td>
                <td>
                  {li.received_qty} / {li.qty}
                  {li.quality_pass !== null && (
                    <span className={`ml-2 text-xs ${li.quality_pass ? "text-green-700" : "text-red-600"}`}>
                      {li.quality_pass ? "Pass" : "Fail"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <div className="mt-4 flex gap-2 print:hidden">
          {po.status === "draft" && (
            <>
              <Link
                href={`/purchase-orders/${po.id}/edit`}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Edit
              </Link>
              <form action={markPoSent}>
                <input type="hidden" name="po_id" value={po.id} />
                <button className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800">
                  Mark sent to vendor
                </button>
              </form>
            </>
          )}
          {po.status === "fully_received" && (
            <form action={closePo}>
              <input type="hidden" name="po_id" value={po.id} />
              <button className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
                Close PO
              </button>
            </form>
          )}
        </div>
      </div>

      {po.status !== "draft" && po.status !== "closed" && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 print:hidden">
          <h2 className="mb-3 font-medium text-zinc-900">Receive items</h2>
          <div className="space-y-3">
            {items
              .filter((li) => li.received_qty < li.qty)
              .map((li) => (
                <form key={li.id} action={receivePoLine} className="flex flex-wrap items-end gap-3 rounded-md border border-zinc-100 p-3">
                  <input type="hidden" name="po_id" value={po.id} />
                  <input type="hidden" name="line_item_id" value={li.id} />
                  <div className="flex-1 text-sm text-zinc-700">
                    {li.description} <span className="text-zinc-400">({li.received_qty}/{li.qty} received)</span>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500">Qty received now</label>
                    <input
                      name="received_qty"
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={li.qty - li.received_qty}
                      required
                      className="w-28 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                    />
                  </div>
                  <label className="flex items-center gap-1 text-sm text-zinc-700">
                    <input type="checkbox" name="quality_pass" defaultChecked className="rounded border-zinc-300" />
                    Quality pass
                  </label>
                  <button className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800">
                    Record
                  </button>
                </form>
              ))}
            {items.every((li) => li.received_qty >= li.qty) && (
              <p className="text-sm text-zinc-400">All line items fully received.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
