import { notFound } from "next/navigation";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";
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
          <h1 className="text-xl font-semibold text-zinc-900">{asset.name}</h1>
          <p className="text-sm text-zinc-500">{asset.asset_tag} · {asset.category}</p>
        </div>
        <StatusBadge status={asset.status} />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
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
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="mb-3 font-medium text-zinc-900">Lease out</h2>
          <form action={leaseOutEquipment} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="hidden" name="asset_id" value={asset.id} />
            <input name="client_name" required placeholder="Client (e.g. Shell, ExxonMobil)" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm sm:col-span-2" />
            <div>
              <label className="block text-xs text-zinc-500">Start date</label>
              <input name="start_date" type="date" required className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500">Expected return date</label>
              <input name="expected_return_date" type="date" required className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-zinc-500">Day rate for this lease (₦)</label>
              <input name="day_rate_ngn" type="number" min="0" step="0.01" defaultValue={asset.day_rate_ngn} required className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
            </div>
            <button className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 sm:col-span-2">
              Lease out
            </button>
          </form>
        </div>
      )}

      {activeLease && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="mb-3 font-medium text-zinc-900">Active lease</h2>
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
              <input name="return_condition" placeholder="e.g. Minor wear, fully operational" className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
            </div>
            <label className="flex items-center gap-1 text-sm text-zinc-700">
              <input type="checkbox" name="inspection_pass" defaultChecked className="rounded border-zinc-300" />
              Inspection pass
            </label>
            <button className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800">
              Mark returned
            </button>
          </form>
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-3 font-medium text-zinc-900">Lease history</h2>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-zinc-200 text-left text-zinc-500">
            <tr>
              <th className="py-2">Client</th>
              <th>Start</th>
              <th>Expected return</th>
              <th>Actual return</th>
              <th>Status</th>
              <th>Condition</th>
            </tr>
          </thead>
          <tbody>
            {(leases ?? []).map((l: EquipmentLease) => (
              <tr key={l.id} className="border-b border-zinc-100">
                <td className="py-2">{l.client_name}</td>
                <td>{l.start_date}</td>
                <td>{l.expected_return_date}</td>
                <td>{l.actual_return_date ?? "—"}</td>
                <td>
                  <StatusBadge status={l.status} />
                </td>
                <td>
                  {l.return_condition ?? "—"}
                  {l.return_inspection_pass !== null && (
                    <span className={`ml-1 text-xs ${l.return_inspection_pass ? "text-green-700" : "text-red-600"}`}>
                      {l.return_inspection_pass ? "Pass" : "Fail"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {(leases ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-zinc-400">
                  No lease history yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
