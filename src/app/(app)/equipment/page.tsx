import Link from "next/link";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/PageHeader";
import { ButtonLink } from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import { TruckIcon } from "@/components/icons";
import type { EquipmentAsset } from "@/lib/database.types";

export default async function EquipmentPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  const supabase = await createClient();
  const { data: assets } = await supabase.from("equipment_assets").select("*").order("name");
  const rows = assets ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Equipment" actions={<ButtonLink href="/equipment/new">Add asset</ButtonLink>} />

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <EmptyState icon={<TruckIcon />} title="No equipment on file yet" action={<ButtonLink href="/equipment/new" size="sm">Add asset</ButtonLink>} />
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/70 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Asset tag</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Day rate</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((a: EquipmentAsset) => (
                <tr key={a.id} className="transition-colors hover:bg-blue-50/40">
                  <td className="px-4 py-3">
                    <Link href={`/equipment/${a.id}`} className="font-medium text-blue-700 hover:underline">
                      {a.asset_tag}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{a.name}</td>
                  <td className="px-4 py-3 text-zinc-700">{a.category}</td>
                  <td className="px-4 py-3 text-zinc-700">{formatNaira(a.day_rate_ngn)}/day</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
