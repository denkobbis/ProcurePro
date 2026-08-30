import { notFound } from "next/navigation";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/Button";
import MoneyInput from "@/components/MoneyInput";
import EmptyState from "@/components/EmptyState";
import { TruckIcon } from "@/components/icons";
import { leaseOutEquipment, markEquipmentReturned } from "@/app/actions/equipment";
import { RecordHeader, RecordSection, FactsPanel } from "@/components/RecordPanels";
import type { EquipmentLease } from "@/lib/database.types";

export default async function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  const supabase = await createClient();
  const { data: asset } = await supabase.from("equipment_assets").select("*").eq("id", id).single();
  if (!asset) notFound();

  const { data: leases } = await supabase.from("equipment_leases").select("*").eq("asset_id", id).order("created_at", { ascending: false });
  const activeLease = (leases ?? []).find((l: EquipmentLease) => l.status === "active");

  return (
    <div className="max-w-3xl space-y-4">
      <RecordHeader
        backHref="/equipment"
        backLabel="Back to equipment"
        title={asset.name}
        subline={`${asset.asset_tag} · ${asset.category}`}
        badges={<StatusBadge status={asset.status} />}
      />

      <RecordSection title="Asset details">
        <FactsPanel
          facts={[
            { label: "Day rate", value: `${formatNaira(asset.day_rate_ngn)}/day` },
            ...(asset.notes ? [{ label: "Notes", value: asset.notes, full: true }] : []),
          ]}
        />
      </RecordSection>

      {asset.status === "available" && (
        <RecordSection title="Lease out">
          <form action={leaseOutEquipment} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="hidden" name="asset_id" value={asset.id} />
            <input name="client_name" required placeholder="Client (e.g. Shell, ExxonMobil)" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400">Start date</label>
              <input name="start_date" type="date" required className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400">Expected return date</label>
              <input name="expected_return_date" type="date" required className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-zinc-500 dark:text-zinc-400">Day rate for this lease (₦)</label>
              <MoneyInput name="day_rate_ngn" defaultValue={asset.day_rate_ngn} required className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
            <Button type="submit" className="sm:col-span-2">Lease out</Button>
          </form>
        </RecordSection>
      )}

      {activeLease && (
        <RecordSection title="Active lease">
          <FactsPanel
            facts={[
              { label: "Client", value: activeLease.client_name },
              { label: "Day rate", value: `${formatNaira(activeLease.day_rate_ngn)}/day` },
              { label: "Start date", value: activeLease.start_date },
              { label: "Expected return", value: activeLease.expected_return_date },
            ]}
          />
          <form action={markEquipmentReturned} className="mt-3 flex flex-wrap items-end gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <input type="hidden" name="asset_id" value={asset.id} />
            <input type="hidden" name="lease_id" value={activeLease.id} />
            <div className="flex-1">
              <label className="block text-xs text-zinc-500 dark:text-zinc-400">Return condition</label>
              <input name="return_condition" placeholder="e.g. Minor wear, fully operational" className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
            <label className="flex items-center gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              <input type="checkbox" name="inspection_pass" defaultChecked className="rounded border-zinc-300 dark:border-zinc-700" />
              Inspection pass
            </label>
            <Button type="submit" variant="success" size="sm">Mark returned</Button>
          </form>
        </RecordSection>
      )}

      <RecordSection title="Lease history">
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          {(leases ?? []).length === 0 ? (
            <EmptyState icon={<TruckIcon />} title="No lease history yet" />
          ) : (
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                  <th className="px-5 py-2.5">Client</th>
                  <th className="px-4 py-2.5">Start</th>
                  <th className="px-4 py-2.5">Expected return</th>
                  <th className="px-4 py-2.5">Actual return</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(leases ?? []).map((l: EquipmentLease) => (
                  <tr key={l.id} className="transition-colors hover:bg-brand-50/40 dark:hover:bg-brand-500/10">
                    <td className="px-5 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">{l.client_name}</td>
                    <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{l.start_date}</td>
                    <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{l.expected_return_date}</td>
                    <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{l.actual_return_date ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                      {l.return_condition ?? "—"}
                      {l.return_inspection_pass !== null && (
                        <span className={`ml-1 text-xs font-medium ${l.return_inspection_pass ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
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
      </RecordSection>
    </div>
  );
}
