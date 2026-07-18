import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import BarList from "@/components/BarList";
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
    <a href={`/reports/export/${type}`} className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline">
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
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Reports</h1>
        <p className="text-sm text-zinc-500">Total spend to date: {formatNaira(totalSpend)} (across all fully-created purchase orders)</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-zinc-900">Spend by department</h2>
            <ExportLink type="department" />
          </div>
          <BarList rows={byDepartment} />
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-zinc-900">Spend by category</h2>
            <ExportLink type="category" />
          </div>
          <BarList rows={byCategory} />
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-zinc-900">Top vendors by spend</h2>
            <ExportLink type="vendor" />
          </div>
          <BarList rows={byVendor} limit={5} />
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-zinc-900">Spend trend (last 6 months)</h2>
            <ExportLink type="trend" />
          </div>
          <BarList rows={trend} />
        </section>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 font-medium text-zinc-900">Pending approvals across the company</h2>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-zinc-200 text-left text-zinc-500">
            <tr>
              <th className="py-2">Request #</th>
              <th>Description</th>
              <th>Step</th>
              <th>Waiting on</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {pendingApprovals.map((a, i) => (
              <tr key={i} className="border-b border-zinc-100">
                <td className="py-2">{a.request_number}</td>
                <td className="max-w-xs truncate">{a.description}</td>
                <td>{a.step_order}</td>
                <td className="capitalize">{a.approver_role.replace(/_/g, " ")}</td>
                <td>{formatNaira(a.amount)}</td>
              </tr>
            ))}
            {pendingApprovals.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-zinc-400">
                  Nothing pending approval right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 font-medium text-zinc-900">Vendor certifications expiring within 60 days</h2>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="border-b border-zinc-200 text-left text-zinc-500">
            <tr>
              <th className="py-2">Vendor</th>
              <th>Certificate / document</th>
              <th>Expiry date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {expiringCerts.map((c, i) => (
              <tr key={i} className="border-b border-zinc-100">
                <td className="py-2">{c.vendor_name}</td>
                <td>{c.label}</td>
                <td>{c.expiry_date}</td>
                <td>
                  {c.daysUntilExpiry < 0 ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Expired</span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{c.daysUntilExpiry}d left</span>
                  )}
                </td>
              </tr>
            ))}
            {expiringCerts.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-zinc-400">
                  Nothing expiring soon.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </section>
    </div>
  );
}
