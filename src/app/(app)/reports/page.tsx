import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import BarList from "@/components/BarList";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { InboxIcon, ChartBarIcon } from "@/components/icons";
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
    <a href={`/reports/export/${type}`} className="text-xs font-medium text-zinc-500 hover:text-blue-700 hover:underline">
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
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description={`Total spend to date: ${formatNaira(totalSpend)} (across all fully-created purchase orders)`}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Spend by department</h2>
            <ExportLink type="department" />
          </div>
          <BarList rows={byDepartment} />
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Spend by category</h2>
            <ExportLink type="category" />
          </div>
          <BarList rows={byCategory} />
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Top vendors by spend</h2>
            <ExportLink type="vendor" />
          </div>
          <BarList rows={byVendor} limit={5} />
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Spend trend (last 6 months)</h2>
            <ExportLink type="trend" />
          </div>
          <BarList rows={trend} />
        </section>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <h2 className="border-b border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-900">
          Pending approvals across the company
        </h2>
        <div className="overflow-x-auto">
          {pendingApprovals.length === 0 ? (
            <EmptyState icon={<ChartBarIcon />} title="Nothing pending approval right now" />
          ) : (
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50/70 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-5 py-3">Request #</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Step</th>
                  <th className="px-4 py-3">Waiting on</th>
                  <th className="px-4 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {pendingApprovals.map((a, i) => (
                  <tr key={i} className="transition-colors hover:bg-blue-50/40">
                    <td className="px-5 py-3 font-medium text-zinc-900">{a.request_number}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-zinc-700">{a.description}</td>
                    <td className="px-4 py-3 text-zinc-700">{a.step_order}</td>
                    <td className="px-4 py-3 capitalize text-zinc-700">{a.approver_role.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-zinc-700">{formatNaira(a.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <h2 className="border-b border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-900">
          Vendor certifications expiring within 60 days
        </h2>
        <div className="overflow-x-auto">
          {expiringCerts.length === 0 ? (
            <EmptyState icon={<InboxIcon />} title="Nothing expiring soon" />
          ) : (
            <table className="w-full min-w-[480px] text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50/70 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-5 py-3">Vendor</th>
                  <th className="px-4 py-3">Certificate / document</th>
                  <th className="px-4 py-3">Expiry date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {expiringCerts.map((c, i) => (
                  <tr key={i} className="transition-colors hover:bg-blue-50/40">
                    <td className="px-5 py-3 font-medium text-zinc-900">{c.vendor_name}</td>
                    <td className="px-4 py-3 text-zinc-700">{c.label}</td>
                    <td className="px-4 py-3 text-zinc-700">{c.expiry_date}</td>
                    <td className="px-4 py-3">
                      {c.daysUntilExpiry < 0 ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Expired</span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{c.daysUntilExpiry}d left</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
