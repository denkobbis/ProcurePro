import { getCurrentProfile, getCurrentOrganization, requireRole, PROCUREMENT_ROLES, ADMIN_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { evaluateVendorCompliance, type ComplianceVerdict } from "@/lib/ncdmb-compliance";
import { createComplianceRule, deleteComplianceRule } from "@/app/actions/compliance";
import { Button } from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import { RecordSection, StatsRow } from "@/components/RecordPanels";
import { ShieldCheckIcon } from "@/components/icons";
import type { Vendor, NcdmbComplianceRule } from "@/lib/database.types";
import Link from "next/link";

const VERDICT_LABEL: Record<ComplianceVerdict, string> = {
  compliant: "Compliant",
  at_risk: "At risk",
  non_compliant: "Non-compliant",
  not_rated: "Not rated",
};

const VERDICT_CLASS: Record<ComplianceVerdict, string> = {
  compliant: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  at_risk: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  non_compliant: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  not_rated: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

export default async function CompliancePage() {
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);
  const org = await getCurrentOrganization(profile);
  const canManage = ADMIN_ROLES.includes(profile.role) || profile.role === "procurement_officer";

  const supabase = await createClient();
  const [{ data: vendorsData }, { data: rulesData }] = await Promise.all([
    supabase.from("vendors").select("*").order("name"),
    supabase.from("ncdmb_compliance_rules").select("*").order("category"),
  ]);
  const vendors = (vendorsData ?? []) as Vendor[];
  const rules = (rulesData ?? []) as NcdmbComplianceRule[];

  const results = vendors.map((vendor) => ({ vendor, result: evaluateVendorCompliance(vendor, rules) }));
  const counts = { compliant: 0, at_risk: 0, non_compliant: 0, not_rated: 0 };
  for (const { result } of results) counts[result.verdict]++;

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-[38px] font-semibold leading-none tracking-tight text-zinc-900 dark:text-zinc-100">Compliance</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          NCDMB local-content compliance across every vendor, checked against rules {org.name} defines below — not an assumed official
          threshold.
        </p>
      </div>

      <RecordSection title="Overview">
        <StatsRow
          stats={[
            { label: "Compliant", value: String(counts.compliant) },
            { label: "At risk", value: String(counts.at_risk) },
            { label: "Non-compliant", value: String(counts.non_compliant) },
            { label: "Not rated", value: String(counts.not_rated) },
          ]}
        />
      </RecordSection>

      <RecordSection title="Vendors">
        <div className="-m-5 overflow-x-auto">
          {results.length === 0 ? (
            <EmptyState icon={<ShieldCheckIcon />} title="No vendors yet" />
          ) : (
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                  <th className="px-5 py-2.5">Vendor</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Local content</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {results.map(({ vendor, result }) => (
                  <tr key={vendor.id} className="transition-colors hover:bg-brand-50/40 dark:hover:bg-zinc-800/60">
                    <td className="px-5 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/vendors/${vendor.id}`} className="hover:underline">
                        {vendor.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{vendor.category ?? "—"}</td>
                    <td className="px-4 py-2.5 tabular-nums text-zinc-700 dark:text-zinc-300">
                      {vendor.local_content_percentage == null ? "—" : `${vendor.local_content_percentage}%`}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${VERDICT_CLASS[result.verdict]}`}>{VERDICT_LABEL[result.verdict]}</span>
                    </td>
                    <td className="max-w-xs px-4 py-2.5 text-xs text-zinc-500 dark:text-zinc-400">{result.reasons[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </RecordSection>

      <RecordSection title="Compliance rules by category">
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          NCDMB&apos;s actual minimum local-content targets vary by category and change periodically per NCDMB&apos;s own guidance — set
          whatever threshold applies to your own contracts for each vendor category you use.
        </p>
        <ul className="space-y-2">
          {rules.map((rule) => (
            <li key={rule.id} className="flex flex-wrap items-center gap-3 rounded-md border border-zinc-100 p-3 text-sm dark:border-zinc-800">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{rule.category}</span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {rule.minimum_local_content_percentage == null ? "No % minimum" : `≥ ${rule.minimum_local_content_percentage}% local content`}
                {rule.requires_certificate ? " · certificate required" : ""}
              </span>
              {canManage && (
                <form action={deleteComplianceRule} className="ml-auto">
                  <input type="hidden" name="rule_id" value={rule.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Remove
                  </Button>
                </form>
              )}
            </li>
          ))}
          {rules.length === 0 && <li className="text-sm text-zinc-400 dark:text-zinc-500">No compliance rules set yet — every vendor shows as &ldquo;Not rated&rdquo; until you add one.</li>}
        </ul>

        {canManage && (
          <form action={createComplianceRule} className="mt-5 grid grid-cols-1 gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-4 dark:border-zinc-800">
            <div className="sm:col-span-2">
              <label className="block text-xs text-zinc-500 dark:text-zinc-400">Vendor category</label>
              <input
                name="category"
                required
                placeholder="e.g. Fabrication"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400">Min. local content %</label>
              <input
                name="minimum_local_content_percentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="Optional"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input type="checkbox" name="requires_certificate" defaultChecked className="rounded border-zinc-300 dark:border-zinc-600" />
                Certificate required
              </label>
            </div>
            <div className="sm:col-span-4">
              <label className="block text-xs text-zinc-500 dark:text-zinc-400">Notes (optional)</label>
              <input
                name="notes"
                placeholder="e.g. Per NCDMB Nigerian Content Plan 2026, category B"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div className="sm:col-span-4">
              <Button type="submit" variant="secondary" size="sm">
                Add rule
              </Button>
            </div>
          </form>
        )}
      </RecordSection>
    </div>
  );
}
