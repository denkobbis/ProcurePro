import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile, getCurrentOrganization, requireRole, PROCUREMENT_ROLES, ADMIN_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira, formatMoney } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";
import PrintButton from "@/components/PrintButton";
import { Button, ButtonLink } from "@/components/Button";
import { markPoSent, markPoInTransit, markPoCustomsCleared, closePo, receivePoLine } from "@/app/actions/po";
import { initiatePayment, finalizePaystackPayment } from "@/app/actions/payments";
import { getIndustryModules } from "@/lib/industries";
import { checkPoAnomalies, DUPLICATE_WINDOW_DAYS } from "@/lib/po-anomaly";
import { checkFxExposure } from "@/lib/fx-exposure";
import { matchInvoiceToPo } from "@/lib/invoice-match";
import { SparkleIcon } from "@/components/icons";
import { RecordHeader, Stepper, RecordSection, FactsPanel, NotePanel, PlatePanel, type StepDef } from "@/components/RecordPanels";
import RecordInvoiceForm from "@/components/RecordInvoiceForm";
import InvoiceMatchPanel from "@/components/InvoiceMatchPanel";
import type { PoLineItem, Payment, PoStatus, Invoice, InvoiceLineItem } from "@/lib/database.types";

const PO_STEPS: { key: PoStatus; label: string }[] = [
  { key: "draft", label: "Drafted" },
  { key: "sent_to_vendor", label: "Sent" },
  { key: "in_transit", label: "In transit" },
  { key: "customs_clearance", label: "Customs" },
  { key: "partially_received", label: "Receiving" },
  { key: "closed", label: "Closed" },
];

function stepperFor(status: PoStatus): StepDef[] {
  const order: PoStatus[] = ["draft", "sent_to_vendor", "in_transit", "customs_clearance", "partially_received", "fully_received", "closed"];
  const effectiveIndex = order.indexOf(status === "fully_received" ? "partially_received" : status);
  return PO_STEPS.map((s, i) => {
    let state: StepDef["state"] = "todo";
    if (i < effectiveIndex) state = "done";
    else if (i === effectiveIndex) state = status === "closed" || status === "fully_received" ? "done" : "current";
    return { label: s.label, state };
  });
}

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);
  const org = await getCurrentOrganization(profile);
  const modules = getIndustryModules(org.industry);

  const supabase = await createClient();
  const { data: po } = await supabase.from("purchase_orders").select("*").eq("id", id).single();
  if (!po) notFound();

  const [{ data: lineItems }, { data: vendor }, { data: department }, { data: payments }, { data: invoiceRows }] = await Promise.all([
    supabase.from("po_line_items").select("*").eq("po_id", id).order("created_at"),
    supabase.from("vendors").select("*").eq("id", po.vendor_id).single(),
    supabase.from("departments").select("*").eq("id", po.department_id).single(),
    supabase.from("payments").select("*").eq("purchase_order_id", id).order("created_at", { ascending: false }),
    supabase.from("invoices").select("*").eq("po_id", id).order("created_at", { ascending: false }),
  ]);
  const paymentAttempts = (payments ?? []) as Payment[];
  const amountPaid = paymentAttempts.filter((p) => p.status === "success").reduce((sum, p) => sum + Number(p.amount), 0);
  const amountRemaining = po.total_amount_ngn - amountPaid;
  const canPay = ADMIN_ROLES.includes(profile.role);
  const canInitiatePayment = canPay && po.payment_status !== "paid" && po.payment_status !== "processing" && amountRemaining > 0;
  const vendorHasPayout = Boolean(vendor?.account_number);

  const items = (lineItems ?? []) as PoLineItem[];
  const invoices = (invoiceRows ?? []) as Invoice[];
  const invoiceIds = invoices.map((inv) => inv.id);
  const { data: allInvoiceLines } = invoiceIds.length
    ? await supabase.from("invoice_line_items").select("*").in("invoice_id", invoiceIds)
    : { data: [] as InvoiceLineItem[] };
  const invoiceMatches = invoices.map((inv) => ({
    invoice: inv,
    match: matchInvoiceToPo(
      ((allInvoiceLines ?? []) as InvoiceLineItem[]).filter((l) => l.invoice_id === inv.id),
      items
    ),
  }));
  const landedCostNgn = po.total_amount_ngn + po.freight_cost_ngn + po.customs_duty_ngn;
  const anomalies = canPay && canInitiatePayment ? await checkPoAnomalies(supabase, po) : { possibleDuplicates: [], priceJump: null };
  const hasAnomalyFlags = anomalies.possibleDuplicates.length > 0 || anomalies.priceJump !== null;
  const [fxFlag] = po.currency !== "NGN" ? await checkFxExposure([po]) : [];

  return (
    <div className="max-w-4xl space-y-4">
      <RecordHeader
        backHref="/purchase-orders"
        backLabel="Back to purchase orders"
        title={po.po_number}
        subline={(department as { name?: string } | null)?.name}
        badges={
          <>
            <StatusBadge status={po.status} />
            <StatusBadge status={po.payment_status} />
          </>
        }
        actions={
          <>
            {po.status === "draft" && (
              <ButtonLink href={`/purchase-orders/${po.id}/edit`} variant="secondary" size="sm">
                Edit
              </ButtonLink>
            )}
            <PrintButton />
          </>
        }
      />

      <Stepper steps={stepperFor(po.status)} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <RecordSection title="Order details">
            <FactsPanel
              facts={[
                { label: "Vendor", value: (vendor as { name?: string } | null)?.name ?? "—" },
                { label: `PO total (${po.currency})`, value: formatMoney(po.total_amount, po.currency) },
                ...(po.currency !== "NGN" ? [{ label: "FX rate to ₦", value: `1 ${po.currency} = ${formatNaira(po.fx_rate_to_ngn)}` }] : []),
                { label: "Landed cost (₦)", value: formatNaira(landedCostNgn) },
                ...(po.delivery_terms ? [{ label: "Delivery terms", value: po.delivery_terms, full: true }] : []),
                ...(modules.ncdmb && po.local_content_percentage !== null
                  ? [{ label: "Local content (NCDMB)", value: `${po.local_content_percentage}%${po.ncdmb_certificate_number ? ` — Cert #${po.ncdmb_certificate_number}` : ""}` }]
                  : []),
              ]}
            />

            {(po.carrier || po.tracking_number || po.eta || po.customs_reference) && (
              <div className="mt-2 border-t border-zinc-100 pt-2">
                <FactsPanel
                  facts={[
                    ...(po.carrier ? [{ label: "Carrier", value: po.carrier }] : []),
                    ...(po.tracking_number ? [{ label: "Tracking / B/L number", value: po.tracking_number }] : []),
                    ...(po.eta ? [{ label: "ETA", value: po.eta }] : []),
                    ...(po.customs_reference
                      ? [{ label: "Customs reference", value: `${po.customs_reference}${po.customs_cleared_at ? ` — cleared ${new Date(po.customs_cleared_at).toLocaleDateString()}` : ""}` }]
                      : []),
                  ]}
                />
              </div>
            )}

            <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5">MPN / Brand</th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right">Qty</th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right">Unit price</th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right">Line total</th>
                    <th className="whitespace-nowrap px-4 py-2.5">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {items.map((li) => (
                    <tr key={li.id} className="transition-colors hover:bg-brand-50/40">
                      <td className="px-4 py-2.5 text-zinc-900">{li.description}</td>
                      <td className="px-4 py-2.5 text-zinc-500">
                        {li.mpn || li.oem_brand ? `${li.mpn ?? ""}${li.mpn && li.oem_brand ? " · " : ""}${li.oem_brand ?? ""}` : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-zinc-700">{li.qty}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-zinc-700">{formatMoney(li.unit_price, po.currency)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-[17px] tabular-nums font-medium text-zinc-900">
                        {formatMoney(li.qty * li.unit_price, po.currency)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-zinc-700">
                        {li.received_qty} / {li.qty}
                        {li.quality_pass !== null && (
                          <span className={`ml-2 text-xs font-medium ${li.quality_pass ? "text-green-700" : "text-red-600"}`}>
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
                <form action={markPoSent}>
                  <input type="hidden" name="po_id" value={po.id} />
                  <Button type="submit" size="sm">Mark sent to vendor</Button>
                </form>
              )}
              {po.status === "fully_received" && (
                <form action={closePo}>
                  <input type="hidden" name="po_id" value={po.id} />
                  <Button type="submit" variant="secondary" size="sm">Close PO</Button>
                </form>
              )}
            </div>
          </RecordSection>

          {po.status === "sent_to_vendor" && (
            <RecordSection title="Shipping">
              <form action={markPoInTransit} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <input type="hidden" name="po_id" value={po.id} />
                <input name="carrier" placeholder="Carrier" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                <input name="tracking_number" placeholder="Tracking / B/L number" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                <input name="eta" type="date" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                <Button type="submit" size="sm">Mark in transit</Button>
              </form>
            </RecordSection>
          )}

          {(po.status === "sent_to_vendor" || po.status === "in_transit") && (
            <RecordSection title="Customs">
              <form action={markPoCustomsCleared} className="flex flex-wrap gap-3">
                <input type="hidden" name="po_id" value={po.id} />
                <input name="customs_reference" placeholder="Customs reference / bill number" className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                <Button type="submit" size="sm">Mark cleared customs</Button>
              </form>
            </RecordSection>
          )}

          {po.status !== "draft" && po.status !== "closed" && (
            <RecordSection title="Receive items">
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
                          className="w-28 rounded-md border border-zinc-300 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                      </div>
                      <label className="flex items-center gap-1 text-sm text-zinc-700">
                        <input type="checkbox" name="quality_pass" defaultChecked className="rounded border-zinc-300" />
                        Quality pass
                      </label>
                      <Button type="submit" variant="success" size="sm">Record</Button>
                    </form>
                  ))}
                {items.every((li) => li.received_qty >= li.qty) && <p className="text-sm text-zinc-400">All line items fully received.</p>}
              </div>
            </RecordSection>
          )}

          {po.status !== "draft" && (
            <RecordSection title="Invoices">
              {invoiceMatches.length > 0 && (
                <div className="mb-4 space-y-3">
                  {invoiceMatches.map(({ invoice, match }) => (
                    <InvoiceMatchPanel key={invoice.id} invoice={invoice} match={match} />
                  ))}
                </div>
              )}
              <details>
                <summary className="cursor-pointer text-sm font-medium text-brand-700 hover:underline">Record a vendor invoice</summary>
                <div className="mt-3">
                  <RecordInvoiceForm poId={po.id} />
                </div>
              </details>
            </RecordSection>
          )}

          {(canPay || paymentAttempts.length > 0) && (
            <RecordSection title="Payment to vendor">
              {amountPaid > 0 && (
                <p className="mb-3 text-sm text-zinc-600">
                  {formatNaira(amountPaid)} paid of {formatNaira(po.total_amount_ngn)} — {formatNaira(amountRemaining)} remaining
                </p>
              )}

              {canPay && canInitiatePayment && hasAnomalyFlags && (
                <div className="mb-4 space-y-1.5">
                  {anomalies.possibleDuplicates.length > 0 && (
                    <NotePanel tone="warn">
                      <span className="flex items-start gap-2">
                        <SparkleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        Possible duplicate: {anomalies.possibleDuplicates.map((d) => d.po_number).join(", ")} — same vendor, same amount, opened within{" "}
                        {DUPLICATE_WINDOW_DAYS} days. Worth checking this isn&apos;t a repeat payment.
                      </span>
                    </NotePanel>
                  )}
                  {anomalies.priceJump && (
                    <NotePanel tone="warn">
                      <span className="flex items-start gap-2">
                        <SparkleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        This PO is {anomalies.priceJump.percentAbove}% above this vendor&apos;s usual amount ({formatNaira(anomalies.priceJump.historicalAvgNgn)} average) —
                        worth a second look before paying.
                      </span>
                    </NotePanel>
                  )}
                </div>
              )}

              {canPay && canInitiatePayment ? (
                vendorHasPayout ? (
                  <form action={initiatePayment} className="mb-4 space-y-2">
                    <input type="hidden" name="po_id" value={po.id} />
                    <div>
                      <label className="block text-xs text-zinc-500">Amount (defaults to the full remaining balance)</label>
                      <input
                        name="amount"
                        type="number"
                        min="0.01"
                        max={amountRemaining}
                        step="0.01"
                        placeholder={String(amountRemaining)}
                        className="mt-1 w-48 rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" name="provider" value="paystack" size="sm">Pay via Paystack</Button>
                      <Button type="submit" name="provider" value="flutterwave" variant="secondary" size="sm">Pay via Flutterwave</Button>
                    </div>
                  </form>
                ) : (
                  <p className="mb-4 text-sm text-amber-700">
                    This vendor has no payout details on file yet — add them on the{" "}
                    <Link href={`/vendors/${po.vendor_id}`} className="underline">vendor page</Link> before paying.
                  </p>
                )
              ) : null}

              {paymentAttempts.length === 0 ? (
                <p className="text-sm text-zinc-400">No payment attempts yet.</p>
              ) : (
                <div className="space-y-2">
                  {paymentAttempts.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-md border border-zinc-100 p-3 text-sm">
                      <StatusBadge status={p.status} />
                      <span className="text-zinc-700 capitalize">{p.provider}</span>
                      <span className="text-zinc-900 font-medium">{formatNaira(p.amount)}</span>
                      <span className="text-zinc-400">{new Date(p.initiated_at).toLocaleString()}</span>
                      {p.provider_reference && <span className="text-zinc-400">Ref: {p.provider_reference}</span>}
                      {p.failure_reason && <span className="text-red-600">{p.failure_reason}</span>}
                      {canPay && p.provider === "paystack" && p.status === "pending" && (
                        <form action={finalizePaystackPayment} className="flex items-center gap-2">
                          <input type="hidden" name="payment_id" value={p.id} />
                          <input
                            name="otp"
                            placeholder="OTP (if requested)"
                            className="w-32 rounded-md border border-zinc-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                          />
                          <Button type="submit" variant="secondary" size="sm">Finalize</Button>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </RecordSection>
          )}
        </div>

        <div className="space-y-4">
          <PlatePanel
            label="Landed cost"
            value={formatNaira(landedCostNgn)}
            rows={[
              { label: "PO value", value: formatNaira(po.total_amount_ngn) },
              { label: "Freight", value: formatNaira(po.freight_cost_ngn) },
              { label: "Customs duty", value: formatNaira(po.customs_duty_ngn) },
            ]}
          />
          {fxFlag && (
            <NotePanel tone="warn" title="FX moved since this PO was raised">
              {fxFlag.currency} is {fxFlag.percentChange > 0 ? "up" : "down"} {Math.abs(fxFlag.percentChange)}% vs. this PO&apos;s rate — landed cost is now roughly{" "}
              {formatNaira(Math.abs(fxFlag.ngnImpact))} {fxFlag.ngnImpact >= 0 ? "more" : "less"} in NGN.
            </NotePanel>
          )}
        </div>
      </div>
    </div>
  );
}
