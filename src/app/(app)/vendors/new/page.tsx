import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createVendor } from "@/app/actions/vendors";

export default async function NewVendorPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold text-zinc-900">Add vendor</h1>
      <form action={createVendor} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-zinc-700">Vendor name</label>
          <input name="name" required className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Category</label>
          <input name="category" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Contact email</label>
            <input name="contact_email" type="email" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Contact phone</label>
            <input name="contact_phone" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Payment terms</label>
          <input name="payment_terms" placeholder="e.g. Net 30" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="is_approved" className="rounded border-zinc-300" />
          Mark as approved (can be used on purchase orders immediately)
        </label>
        <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
          Save vendor
        </button>
      </form>
    </div>
  );
}
