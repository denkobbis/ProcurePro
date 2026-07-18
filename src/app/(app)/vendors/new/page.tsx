import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createVendor } from "@/app/actions/vendors";
import NcdmbFields from "@/components/NcdmbFields";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/Button";

export default async function NewVendorPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  return (
    <div className="max-w-xl space-y-4">
      <PageHeader title="Add vendor" />
      <form action={createVendor} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-zinc-700">Vendor name</label>
          <input name="name" required className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Category</label>
          <input name="category" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Contact email</label>
            <input name="contact_email" type="email" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Contact phone</label>
            <input name="contact_phone" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Payment terms</label>
          <input name="payment_terms" placeholder="e.g. Net 30" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="is_approved" className="rounded border-zinc-300" />
          Mark as approved (can be used on purchase orders immediately)
        </label>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">Currency &amp; compliance</label>
          <NcdmbFields />
        </div>

        <Button type="submit">Save vendor</Button>
      </form>
    </div>
  );
}
