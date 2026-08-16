import { getCurrentProfile, ADMIN_ROLES, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createApprovalRule, deleteApprovalRule } from "@/app/actions/approval-rules";
import { formatNaira } from "@/lib/money";
import { Button } from "@/components/Button";
import { RecordSection } from "@/components/RecordPanels";
import type { ApprovalRule, Department } from "@/lib/database.types";

const ROLE_OPTIONS = ["approver", "procurement_officer", "finance_admin", "super_admin"] as const;
const ROLE_LABELS: Record<string, string> = {
  requester: "Requester",
  approver: "Approver",
  procurement_officer: "Procurement Officer",
  finance_admin: "Finance / Admin",
  super_admin: "Super Admin",
};

export default async function ApprovalRulesPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, ADMIN_ROLES);

  const supabase = await createClient();
  const [{ data: rules }, { data: departments }] = await Promise.all([
    supabase.from("approval_rules").select("*").order("department_id").order("min_amount"),
    supabase.from("departments").select("*").order("name"),
  ]);

  const deptMap = new Map((departments ?? []).map((d: Department) => [d.id, d.name]));
  const rows = (rules ?? []) as ApprovalRule[];

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-[38px] font-semibold leading-none tracking-tight text-zinc-900">Approval rules</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Who has to sign off on a request, and at what amount — routed by department and value, in the order set below.
        </p>
      </div>

      <RecordSection title="Current rules">
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-400">No approval rules configured yet — every request will have nothing to route through until you add one.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  <th className="px-4 py-2.5">Department</th>
                  <th className="px-4 py-2.5">Amount range</th>
                  <th className="px-4 py-2.5">Step</th>
                  <th className="px-4 py-2.5">Approver role</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-brand-50/40">
                    <td className="px-4 py-2.5 text-zinc-900">{r.department_id ? deptMap.get(r.department_id) ?? "—" : "All departments"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-zinc-700">
                      {formatNaira(r.min_amount)} {r.max_amount != null ? `– ${formatNaira(r.max_amount)}` : "+"}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-zinc-700">{r.step_order}</td>
                    <td className="px-4 py-2.5 text-zinc-700">{ROLE_LABELS[r.approver_role] ?? r.approver_role}</td>
                    <td className="px-4 py-2.5">
                      <form action={deleteApprovalRule}>
                        <input type="hidden" name="rule_id" value={r.id} />
                        <button className="text-xs font-medium text-red-600 hover:underline">Remove</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[13px] text-zinc-400">
          Leave department blank for a rule that applies org-wide. Step order controls sequence when a request needs more than one
          sign-off — step 1 acts first.
        </p>
      </RecordSection>

      <RecordSection title="Add a rule">
        <form action={createApprovalRule} className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
          <select name="department_id" defaultValue="" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm">
            <option value="">All departments</option>
            {(departments ?? []).map((d: Department) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select name="approver_role" defaultValue="approver" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm">
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <input name="min_amount" type="number" min="0" step="0.01" required placeholder="Min amount (₦)" defaultValue="0" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
          <input name="max_amount" type="number" min="0" step="0.01" placeholder="Max amount (₦, optional — no upper bound)" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
          <input name="step_order" type="number" min="1" step="1" required placeholder="Step order" defaultValue="1" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
          <Button type="submit" className="sm:col-span-2">Add rule</Button>
        </form>
      </RecordSection>
    </div>
  );
}
