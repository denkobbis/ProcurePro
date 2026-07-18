import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createRequest } from "@/app/actions/requests";
import type { Vendor } from "@/lib/database.types";

export default async function NewRequestPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data: vendors } = await supabase.from("vendors").select("*").order("name");

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold text-zinc-900">New purchase request</h1>

      <form action={createRequest} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-zinc-700">Item / service description</label>
          <textarea
            name="description"
            required
            rows={3}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            placeholder="e.g. 5x Toyota Hilux replacement tyres, 265/65R17"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Category</label>
            <input
              name="category"
              required
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              placeholder="e.g. Equipment & Tools"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Urgency</label>
            <select name="urgency" defaultValue="normal" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Quantity</label>
            <input
              name="qty"
              type="number"
              min="0.01"
              step="0.01"
              required
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Estimated unit cost (₦)</label>
            <input
              name="est_unit_cost"
              type="number"
              min="0"
              step="0.01"
              required
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Manufacturer part number (optional)</label>
            <input name="mpn" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" placeholder="e.g. HT-4500-XL" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">OEM brand (optional)</label>
            <input name="oem_brand" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" placeholder="e.g. Hytorc, Emerson, Ludecke" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Preferred vendor (optional)</label>
          <select name="vendor_id" defaultValue="" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
            <option value="">No preference</option>
            {(vendors ?? []).map((v: Vendor) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Justification</label>
          <textarea
            name="justification"
            rows={2}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Why is this purchase needed?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Attach a quote / PDF (optional)</label>
          <input name="attachment" type="file" className="mt-1 w-full text-sm" />
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="submit_now" defaultChecked className="rounded border-zinc-300" />
          Submit for approval now (uncheck to save as draft)
        </label>

        <p className="text-xs text-zinc-400">
          Requesting on behalf of: {profile.full_name} — department will be set automatically.
        </p>

        <button type="submit" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
          Save request
        </button>
      </form>
    </div>
  );
}
