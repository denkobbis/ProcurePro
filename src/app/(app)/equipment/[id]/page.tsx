import { notFound } from "next/navigation";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import { TruckIcon } from "@/components/icons";
import { leaseOutEquipment, markEquipmentReturned } from "@/app/actions/equipment";
import type { EquipmentLease } from "@/lib/database.types";

export default async function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  const supabase = await createClient();
  const { data: asset } = await supabase.from("equipment_assets").select("*").eq("id", id).single();
  if (!asset) notFound();

  const { data: leases } = await supabase
    .from("equipment_leases")
    .select("*")
    .eq("asset_id", id)
    .order("created_at", { ascending: false });

  const activeLease = (leases ?? []).find((l: EquipmentLease) => l.status === "active");

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{asset.name}</h1>
          <p className="text-sm text-zinc-500">{asset.asset_tag} · {asset.category}</p>
        </div>
        <StatusBadge status={asset.status} />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Day rate</dt>
            <dd className="text-zinc-900">{formatNaira(asset.day_rate_ngn)}/day</dd>
          </div>
          {asset.notes && (
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Notes</dt>
              <dd className="text-zinc-900">{asset.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      {asset.status === "available" && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Lease out</h2>
          <form action={leaseOutEquipment} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="hidden" name="asset_id" value={asset.id} />
            <input name="client_name" required placeholder="Client (e.g. Shell, ExxonMobil)" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:col-span-2" />
            <div>
              <label className="block text-xs text-zinc-500">Start date</label>
              <input name="start_date" type="date" required className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500">Expected return date</label>
              <input name="expected_return_date" type="date" required className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-zinc-500">Day rate for this lease (₦)</label>
              <input name="day_rate_ngn" type="number" min="0" step="0.01" defaultValue={asset.day_rate_ngn} required className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <Button type="submit" className="sm:col-span-2">Lease out</Button>
          </form>
        </div>
      )}

      {activeLease && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Active lease</h2>
          <dl className="mb-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Client</dt>
              <dd className="text-zinc-900">{activeLease.client_name}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Day rate</dt>
              <dd className="text-zinc-900">{formatNaira(activeLease.day_rate_ngn)}/day</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Start date</dt>
              <dd className="text-zinc-900">{activeLease.start_date}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Expected return</dt>
              <dd className="text-zinc-900">{activeLease.expected_return_date}</dd>
            </div>
          </dl>
          <form action={markEquipmentReturned} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="asset_id" value={asset.id} />
            <input type="hidden" name="lease_id" value={activeLease.id} />
            <div className="flex-1">
              <label className="block text-xs text-zinc-500">Return condition</label>
              <input name="return_condition" placeholder="e.g. Minor wear, fully operational" className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <label className="flex items-center gap-1 text-sm text-zinc-700">
              <input type="checkbox" name="inspection_pass" defaultChecked className="rounded border-zinc-300" />
              Inspection pass
            </label>
            <Button type="submit" variant="success" size="sm">Mark returned</Button>
          </form>
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <h2 className="border-b border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-900">Lease history</h2>
        <div className="overflow-x-auto">
          {(leases ?? []).length === 0 ? (
            <EmptyState icon={<TruckIcon />} title="No lease history yet" />
          ) : (
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50/70 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-4 py-3">Start</th>
                  <th className="px-4 py-3">Expected return</th>
                  <th className="px-4 py-3">Actual return</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {(leases ?? []).map((l: EquipmentLease) => (
                  <tr key={l.id} className="transition-colors hover:bg-blue-50/40">
                    <td className="px-6 py-3 font-medium text-zinc-900">{l.client_name}</td>
                    <td className="px-4 py-3 text-zinc-700">{l.start_date}</td>
                    <td className="px-4 py-3 text-zinc-700">{l.expected_return_date}</td>
                    <td className="px-4 py-3 text-zinc-700">{l.actual_return_date ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {l.return_condition ?? "—"}
                      {l.return_inspection_pass !== null && (
                        <span className={`ml-1 text-xs font-medium ${l.return_inspection_pass ? "text-green-700" : "text-red-600"}`}>
                          {l.return_inspection_pass ? "Pass" : "Fail"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
