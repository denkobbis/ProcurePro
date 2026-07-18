import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createEquipmentAsset } from "@/app/actions/equipment";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/Button";

export default async function NewEquipmentAssetPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  return (
    <div className="max-w-xl space-y-4">
      <PageHeader title="Add equipment asset" />
      <form action={createEquipmentAsset} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Asset tag</label>
            <input name="asset_tag" required placeholder="e.g. CR-001" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Category</label>
            <input name="category" required placeholder="e.g. Crane, Nitrogen Converter" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Name / description</label>
          <input name="name" required placeholder="e.g. 50-tonne mobile crane" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Day rate (₦)</label>
          <input name="day_rate_ngn" type="number" min="0" step="0.01" required className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Notes (optional)</label>
          <textarea name="notes" rows={2} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <Button type="submit">Save asset</Button>
      </form>
    </div>
  );
}
