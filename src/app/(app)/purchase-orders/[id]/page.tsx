import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira, formatMoney } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";
import PrintButton from "@/components/PrintButton";
import { markPoSent, markPoInTransit, markPoCustomsCleared, closePo, receivePoLine } from "@/app/actions/po";
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
  const landedCostNgn = po.total_amount_ngn + po.freight_cost_ngn + po.customs_duty_ngn;

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
            <dt className="text-zinc-500">PO total ({po.currency})</dt>
            <dd className="font-medium text-zinc-900">{formatMoney(po.total_amount, po.currency)}</dd>
          </div>
          {po.currency !== "NGN" && (
            <div>
              <dt className="text-zinc-500">FX rate to ₦</dt>
              <dd className="text-zinc-900">1 {po.currency} = {formatNaira(po.fx_rate_to_ngn)}</dd>
            </div>
          )}
          <div>
            <dt className="text-zinc-500">Landed cost (₦)</dt>
            <dd className="font-medium text-zinc-900">{formatNaira(landedCostNgn)}</dd>
          </div>
          {(po.freight_cost_ngn > 0 || po.customs_duty_ngn > 0) && (
            <div className="sm:col-span-2 text-xs text-zinc-500">
              PO value: {formatNaira(po.total_amount_ngn)} + Freight: {formatNaira(po.freight_cost_ngn)} + Customs duty: {formatNaira(po.customs_duty_ngn)}
            </div>
          )}
          {po.delivery_terms && (
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Delivery terms</dt>
              <dd className="text-zinc-900">{po.delivery_terms}</dd>
            </div>
          )}
          {po.local_content_percentage !== null && (
            <div>
              <dt className="text-zinc-500">Local content (NCDMB)</dt>
              <dd className="text-zinc-900">{po.local_content_percentage}%{po.ncdmb_certificate_number ? ` — Cert #${po.ncdmb_certificate_number}` : ""}</dd>
            </div>
          )}
        </dl>

        {(po.carrier || po.tracking_number || po.eta || po.customs_reference) && (
          <dl className="mt-4 grid grid-cols-1 gap-4 border-t border-zinc-100 pt-4 text-sm sm:grid-cols-2">
            {po.carrier && (
              <div>
                <dt className="text-zinc-500">Carrier</dt>
                <dd className="text-zinc-900">{po.carrier}</dd>
              </div>
            )}
            {po.tracking_number && (
              <div>
                <dt className="text-zinc-500">Tracking / B/L number</dt>
                <dd className="text-zinc-900">{po.tracking_number}</dd>
              </div>
            )}
            {po.eta && (
              <div>
                <dt className="text-zinc-500">ETA</dt>
                <dd className="text-zinc-900">{po.eta}</dd>
              </div>
            )}
            {po.customs_reference && (
              <div>
                <dt className="text-zinc-500">Customs reference</dt>
                <dd className="text-zinc-900">
                  {po.customs_reference}
                  {po.customs_cleared_at && ` — cleared ${new Date(po.customs_cleared_at).toLocaleDateString()}`}
                </dd>
              </div>
            )}
          </dl>
        )}

        <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-zinc-200 text-left text-zinc-500">
            <tr>
              <th className="py-2">Description</th>
              <th>MPN / Brand</th>
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
                <td className="text-zinc-500">
                  {li.mpn || li.oem_brand ? `${li.mpn ?? ""}${li.mpn && li.oem_brand ? " · " : ""}${li.oem_brand ?? ""}` : "—"}
                </td>
                <td>{li.qty}</td>
                <td>{formatMoney(li.unit_price, po.currency)}</td>
                <td>{formatMoney(li.qty * li.unit_price, po.currency)}</td>
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

        <div className="mt-4 flex flex-wrap gap-2 print:hidden">
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

      {po.status === "sent_to_vendor" && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 print:hidden">
          <h2 className="mb-3 font-medium text-zinc-900">Shipping</h2>
          <form action={markPoInTransit} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <input type="hidden" name="po_id" value={po.id} />
            <input name="carrier" placeholder="Carrier" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
            <input name="tracking_number" placeholder="Tracking / B/L number" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
            <input name="eta" type="date" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
            <button className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800">
              Mark in transit
            </button>
          </form>
        </div>
      )}

      {(po.status === "sent_to_vendor" || po.status === "in_transit") && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 print:hidden">
          <h2 className="mb-3 font-medium text-zinc-900">Customs</h2>
          <form action={markPoCustomsCleared} className="flex flex-wrap gap-3">
            <input type="hidden" name="po_id" value={po.id} />
            <input name="customs_reference" placeholder="Customs reference / bill number" className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
            <button className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800">
              Mark cleared customs
            </button>
          </form>
        </div>
      )}

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
