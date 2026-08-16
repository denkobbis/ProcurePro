import { notFound } from "next/navigation";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { convertToPo } from "@/app/actions/po";
import { formatNaira } from "@/lib/money";
import LineItemsEditor from "@/components/LineItemsEditor";
import CurrencyFields from "@/components/CurrencyFields";
import { Button } from "@/components/Button";
import { estimateLandedCost } from "@/lib/landed-cost-estimate";
import { FormShell, FormPanel, FormField, fieldInputClass, fieldTextareaClass } from "@/components/FormLayout";
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
  const landedCostEstimate = await estimateLandedCost(supabase, request.category);
  const estimatedTotal = request.qty * request.est_unit_cost + (landedCostEstimate?.freightCostNgn ?? 0) + (landedCostEstimate?.customsDutyNgn ?? 0);

  return (
    <FormShell
      backHref={`/requests/${request.id}`}
      backLabel="Back to request"
      title="Create purchase order"
      description={`From request ${request.request_number}: ${request.description}`}
      form={
        <form action={convertToPo}>
          <input type="hidden" name="request_id" value={request.id} />

          <FormPanel title="Vendor & terms">
            <FormField label="Vendor" span={12}>
              <select name="vendor_id" required defaultValue={request.vendor_id ?? ""} className={fieldInputClass}>
                <option value="">Select a vendor...</option>
                {((vendors ?? []) as Vendor[]).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.ncdmb_compliant ? "· NCDMB compliant" : ""}
                  </option>
                ))}
              </select>
              {(vendors ?? []).length === 0 && <p className="mt-1 text-xs text-amber-600">No approved vendors yet — add one under Vendors first.</p>}
            </FormField>
            <FormField label="Delivery terms" span={12} hint="e.g. Deliver to Port Harcourt yard within 10 days">
              <textarea name="delivery_terms" rows={2} className={fieldTextareaClass} />
            </FormField>
          </FormPanel>

          <div className="mt-[18px]">
            <FormPanel
              title="Currency & landed cost"
              note={
                landedCostEstimate
                  ? `Freight and customs duty pre-filled from the average of ${landedCostEstimate.basedOnCount} past "${request.category}" POs — edit to match this vendor's actual quote.`
                  : undefined
              }
            >
              <FormField label="Currency & rate" span={12}>
                <CurrencyFields defaultFreightCost={landedCostEstimate?.freightCostNgn ?? 0} defaultCustomsDuty={landedCostEstimate?.customsDutyNgn ?? 0} />
              </FormField>
            </FormPanel>
          </div>

          <div className="mt-[18px]">
            <FormPanel title="Line items" note="Pre-filled from the request — edit to match the vendor's final quote, or add more lines.">
              <FormField label="Items" span={12}>
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
              </FormField>
            </FormPanel>
          </div>

          <div className="mt-[18px]">
            <Button type="submit" variant="success">
              Create purchase order
            </Button>
          </div>
        </form>
      }
      aside={
        <div className="rounded-lg bg-brand-950 p-5">
          <div className="text-[13px] font-medium text-brand-200">Estimated landed cost</div>
          <div className="mt-1 text-[40px] font-semibold leading-none tabular-nums text-white">{formatNaira(estimatedTotal)}</div>
          <dl className="mt-4 space-y-1.5 text-[13px]">
            <div className="flex justify-between border-t border-white/10 pt-1.5">
              <dt className="text-brand-300">Request value</dt>
              <dd className="tabular-nums text-brand-100">{formatNaira(request.qty * request.est_unit_cost)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-brand-300">Est. freight</dt>
              <dd className="tabular-nums text-brand-100">{formatNaira(landedCostEstimate?.freightCostNgn ?? 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-brand-300">Est. customs duty</dt>
              <dd className="tabular-nums text-brand-100">{formatNaira(landedCostEstimate?.customsDutyNgn ?? 0)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-[12px] text-brand-300">
            {landedCostEstimate
              ? `Based on this org's own history of "${request.category}" purchases — edit the fields on the left to match the real quote.`
              : "No history yet for this category — freight and customs duty default to zero until you enter the vendor's actual quote."}
          </p>
        </div>
      }
    />
  );
}
