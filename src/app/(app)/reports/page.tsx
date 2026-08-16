import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import BarList from "@/components/BarList";
import EmptyState from "@/components/EmptyState";
import SpendCopilot from "@/components/SpendCopilot";
import { InboxIcon, ChartBarIcon } from "@/components/icons";
import { RecordSection } from "@/components/RecordPanels";
import {
  getSpendByDepartment,
  getSpendByCategory,
  getSpendByVendor,
  getSpendTrend,
  getPendingApprovalsOverview,
  getExpiringCertifications,
} from "@/lib/reports";

function ExportLink({ type }: { type: string }) {
  return (
    <a href={`/reports/export/${type}`} className="text-xs font-medium text-zinc-500 hover:text-brand-700 hover:underline dark:text-zinc-400 dark:hover:text-brand-400">
      Export CSV
    </a>
  );
}

export default async function ReportsPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  const supabase = await createClient();
  const [byDepartment, byCategory, byVendor, trend, pendingApprovals, expiringCerts] = await Promise.all([
    getSpendByDepartment(supabase),
    getSpendByCategory(supabase),
    getSpendByVendor(supabase),
    getSpendTrend(supabase, 6),
    getPendingApprovalsOverview(supabase),
    getExpiringCertifications(supabase, 60),
  ]);

  const totalSpend = byDepartment.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[38px] font-semibold leading-none tracking-tight text-zinc-900 dark:text-zinc-100">Reports</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Total spend to date: {formatNaira(totalSpend)} (across all fully-created purchase orders)</p>
      </div>

      <SpendCopilot />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <RecordSection title="Spend by department" actions={<ExportLink type="department" />}>
          <BarList rows={byDepartment} />
        </RecordSection>

        <RecordSection title="Spend by category" actions={<ExportLink type="category" />}>
          <BarList rows={byCategory} />
        </RecordSection>

        <RecordSection title="Top vendors by spend" actions={<ExportLink type="vendor" />}>
          <BarList rows={byVendor} limit={5} />
        </RecordSection>

        <RecordSection title="Spend trend (last 6 months)" actions={<ExportLink type="trend" />}>
          <BarList rows={trend} />
        </RecordSection>
      </div>

      <RecordSection title="Pending approvals across the company">
        <div className="-m-5 overflow-x-auto">
          {pendingApprovals.length === 0 ? (
            <EmptyState icon={<ChartBarIcon />} title="Nothing pending approval right now" />
          ) : (
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                  <th className="px-5 py-2.5">Request #</th>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5">Step</th>
                  <th className="px-4 py-2.5">Waiting on</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {pendingApprovals.map((a, i) => (
                  <tr key={i} className="transition-colors hover:bg-brand-50/40 dark:hover:bg-zinc-800/60">
                    <td className="px-5 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">{a.request_number}</td>
                    <td className="max-w-xs truncate px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{a.description}</td>
                    <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{a.step_order}</td>
                    <td className="px-4 py-2.5 capitalize text-zinc-700 dark:text-zinc-300">{a.approver_role.replace(/_/g, " ")}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-[17px] tabular-nums text-zinc-900 dark:text-zinc-100">{formatNaira(a.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </RecordSection>

      <RecordSection title="Vendor certifications expiring within 60 days">
        <div className="-m-5 overflow-x-auto">
          {expiringCerts.length === 0 ? (
            <EmptyState icon={<InboxIcon />} title="Nothing expiring soon" />
          ) : (
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                  <th className="px-5 py-2.5">Vendor</th>
                  <th className="px-4 py-2.5">Certificate / document</th>
                  <th className="px-4 py-2.5">Expiry date</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {expiringCerts.map((c, i) => (
                  <tr key={i} className="transition-colors hover:bg-brand-50/40 dark:hover:bg-zinc-800/60">
                    <td className="px-5 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">{c.vendor_name}</td>
                    <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{c.label}</td>
                    <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{c.expiry_date}</td>
                    <td className="px-4 py-2.5">
                      {c.daysUntilExpiry < 0 ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">Expired</span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">{c.daysUntilExpiry}d left</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </RecordSection>
    </div>
  );
}
