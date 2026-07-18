import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createEquipmentAsset } from "@/app/actions/equipment";

export default async function NewEquipmentAssetPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold text-zinc-900">Add equipment asset</h1>
      <form action={createEquipmentAsset} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Asset tag</label>
            <input name="asset_tag" required placeholder="e.g. CR-001" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Category</label>
            <input name="category" required placeholder="e.g. Crane, Nitrogen Converter" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Name / description</label>
          <input name="name" required placeholder="e.g. 50-tonne mobile crane" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Day rate (₦)</label>
          <input name="day_rate_ngn" type="number" min="0" step="0.01" required className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Notes (optional)</label>
          <textarea name="notes" rows={2} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
          Save asset
        </button>
      </form>
    </div>
  );
}
