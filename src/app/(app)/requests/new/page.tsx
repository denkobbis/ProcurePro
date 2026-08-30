import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createRequest } from "@/app/actions/requests";
import { checkBudget } from "@/lib/budget";
import { formatNaira } from "@/lib/money";
import { Button } from "@/components/Button";
import RequestAutoFill from "@/components/RequestAutoFill";
import MoneyInput from "@/components/MoneyInput";
import { FormShell, FormPanel, AsidePanel, FormField, fieldInputClass, fieldTextareaClass } from "@/components/FormLayout";
import type { Vendor, ApprovalRule, Budget } from "@/lib/database.types";

const FORM_ID = "new-request-form";
const ROLE_LABELS: Record<string, string> = {
  requester: "Requester",
  approver: "Approver",
  procurement_officer: "Procurement Officer",
  finance_admin: "Finance / Admin",
  super_admin: "Super Admin",
};

export default async function NewRequestPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [{ data: vendors }, { data: rules }, { data: budgets }] = await Promise.all([
    supabase.from("vendors").select("*").order("name"),
    supabase
      .from("approval_rules")
      .select("*")
      .or(`department_id.eq.${profile.department_id},department_id.is.null`)
      .order("min_amount"),
    profile.department_id
      ? supabase.from("budgets").select("*").eq("department_id", profile.department_id)
      : Promise.resolve({ data: [] as Budget[] }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const currentBudgets = ((budgets ?? []) as Budget[]).filter((b) => b.period_start <= today && b.period_end >= today);
  const budgetRows = await Promise.all(
    currentBudgets.map(async (b) => ({ budget: b, usage: profile.department_id ? await checkBudget(supabase, profile.department_id, b.category, 0) : null }))
  );

  return (
    <FormShell
      backHref="/requests"
      backLabel="Back to requests"
      title="New purchase request"
      description="Submit a request for approval, or save it as a draft to finish later."
      form={
        <>
          <RequestAutoFill formId={FORM_ID} />

          <form id={FORM_ID} action={createRequest}>
            <FormPanel title="What do you need" note="Item or service, quantity, and your best estimate of cost.">
              <FormField label="Item / service description" span={12}>
                <textarea name="description" required rows={2} className={fieldTextareaClass} placeholder="e.g. 5x Toyota Hilux replacement tyres, 265/65R17" />
              </FormField>
              <FormField label="Category" span={6}>
                <input name="category" required className={fieldInputClass} placeholder="e.g. Equipment & Tools" />
              </FormField>
              <FormField label="Urgency" span={6}>
                <select name="urgency" defaultValue="normal" className={fieldInputClass}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </FormField>
              <FormField label="Quantity" span={6}>
                <input name="qty" type="number" min="0.01" step="0.01" required className={fieldInputClass} />
              </FormField>
              <FormField label="Estimated unit cost (₦)" span={6}>
                <MoneyInput name="est_unit_cost" required className={fieldInputClass} />
              </FormField>
              <FormField label="Justification" span={12}>
                <textarea name="justification" rows={2} className={fieldTextareaClass} placeholder="Why is this purchase needed?" />
              </FormField>
              <FormField label="Attach a quote / PDF (optional)" span={12}>
                <input name="attachment" type="file" className="w-full text-sm" />
              </FormField>
            </FormPanel>

            <div className="mt-[18px]">
              <FormPanel title="Sourcing" note="Optional — helps procurement route this to the right vendor.">
                <FormField label="Manufacturer part number" span={6}>
                  <input name="mpn" className={fieldInputClass} placeholder="e.g. HT-4500-XL" />
                </FormField>
                <FormField label="OEM brand" span={6}>
                  <input name="oem_brand" className={fieldInputClass} placeholder="e.g. Hytorc, Emerson, Ludecke" />
                </FormField>
                <FormField label="Preferred vendor" span={12}>
                  <select name="vendor_id" defaultValue="" className={fieldInputClass}>
                    <option value="">No preference</option>
                    {((vendors ?? []) as Vendor[]).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </FormField>
              </FormPanel>
            </div>

            <div className="mt-[18px] rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input type="checkbox" name="submit_now" defaultChecked className="rounded border-zinc-300 dark:border-zinc-700" />
                Submit for approval now (uncheck to save as draft)
              </label>
              <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                Requesting on behalf of: {profile.full_name} — department will be set automatically.
              </p>
              <div className="mt-4">
                <Button type="submit">Save request</Button>
              </div>
            </div>
          </form>
        </>
      }
      aside={
        <>
          <AsidePanel title="Your approval chain">
            {(rules ?? []).length === 0 ? (
              <p className="text-sm text-zinc-400 dark:text-zinc-500">No approval rules configured yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {((rules ?? []) as ApprovalRule[]).map((r) => (
                  <li key={r.id} className="flex items-center justify-between border-b border-zinc-100 pb-2 last:border-b-0 last:pb-0 dark:border-zinc-800">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {formatNaira(r.min_amount)}
                      {r.max_amount != null ? ` – ${formatNaira(r.max_amount)}` : "+"}
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{ROLE_LABELS[r.approver_role] ?? r.approver_role}</span>
                  </li>
                ))}
              </ul>
            )}
          </AsidePanel>

          <AsidePanel title="Budget headroom">
            {budgetRows.length === 0 ? (
              <p className="text-sm text-zinc-400 dark:text-zinc-500">No budgets set up for your department this period.</p>
            ) : (
              <ul className="space-y-3">
                {budgetRows.map(({ budget, usage }) => {
                  const used = usage ? usage.committed + usage.spent : 0;
                  const pct = budget.allocated_amount > 0 ? Math.min(100, (used / budget.allocated_amount) * 100) : 0;
                  return (
                    <li key={budget.id}>
                      <div className="flex items-baseline justify-between text-[13px]">
                        <span className="text-zinc-700 dark:text-zinc-300">{budget.category}</span>
                        <span className="tabular-nums text-zinc-500 dark:text-zinc-400">{formatNaira(budget.allocated_amount - used)} left</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div className={`h-full rounded-full ${pct > 90 ? "bg-amber-500" : "bg-brand-600"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </AsidePanel>
        </>
      }
    />
  );
}
