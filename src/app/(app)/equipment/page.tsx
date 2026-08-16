import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import { ButtonLink } from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import { TruckIcon } from "@/components/icons";
import EquipmentTable, { type EquipmentRow } from "./EquipmentTable";
import type { EquipmentAsset } from "@/lib/database.types";

export default async function EquipmentPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  const supabase = await createClient();
  const { data: assets } = await supabase.from("equipment_assets").select("*").order("name");
  const rows = (assets ?? []) as EquipmentAsset[];

  const tableRows: EquipmentRow[] = rows.map((a) => ({
    id: a.id,
    assetTag: a.asset_tag,
    name: a.name,
    category: a.category,
    dayRateLabel: `${formatNaira(a.day_rate_ngn)}/day`,
    status: a.status,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[38px] font-semibold leading-none tracking-tight text-zinc-900 dark:text-zinc-100">Equipment</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Owned and leased assets, with day rate and lease status.</p>
        </div>
        <ButtonLink href="/equipment/new">Add asset</ButtonLink>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <EmptyState icon={<TruckIcon />} title="No equipment on file yet" action={<ButtonLink href="/equipment/new" size="sm">Add asset</ButtonLink>} />
        </div>
      ) : (
        <EquipmentTable rows={tableRows} />
      )}
    </div>
  );
}
