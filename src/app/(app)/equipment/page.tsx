import Link from "next/link";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";
import type { EquipmentAsset } from "@/lib/database.types";

export default async function EquipmentPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  const supabase = await createClient();
  const { data: assets } = await supabase.from("equipment_assets").select("*").order("name");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Equipment</h1>
        <Link href="/equipment/new" className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800">
          Add asset
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2">Asset tag</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Day rate</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(assets ?? []).map((a: EquipmentAsset) => (
              <tr key={a.id} className="border-t border-zinc-100 hover:bg-zinc-50">
                <td className="px-4 py-2">
                  <Link href={`/equipment/${a.id}`} className="font-medium text-zinc-900 hover:underline">
                    {a.asset_tag}
                  </Link>
                </td>
                <td className="px-4 py-2 text-zinc-700">{a.name}</td>
                <td className="px-4 py-2 text-zinc-700">{a.category}</td>
                <td className="px-4 py-2 text-zinc-700">{formatNaira(a.day_rate_ngn)}/day</td>
                <td className="px-4 py-2">
                  <StatusBadge status={a.status} />
                </td>
              </tr>
            ))}
            {(assets ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                  No equipment on file yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
