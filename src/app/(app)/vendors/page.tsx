import Link from "next/link";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Vendor } from "@/lib/database.types";

export default async function VendorsPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  const supabase = await createClient();
  const { data: vendors } = await supabase.from("vendors").select("*").order("name");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Vendors</h1>
        <Link href="/vendors/new" className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800">
          Add vendor
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Payment terms</th>
              <th className="px-4 py-2">Approved</th>
            </tr>
          </thead>
          <tbody>
            {(vendors ?? []).map((v: Vendor) => (
              <tr key={v.id} className="border-t border-zinc-100 hover:bg-zinc-50">
                <td className="px-4 py-2">
                  <Link href={`/vendors/${v.id}`} className="font-medium text-zinc-900 hover:underline">
                    {v.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-zinc-700">{v.category ?? "—"}</td>
                <td className="px-4 py-2 text-zinc-700">{v.contact_email ?? "—"}</td>
                <td className="px-4 py-2 text-zinc-700">{v.payment_terms ?? "—"}</td>
                <td className="px-4 py-2">
                  {v.is_approved ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Approved</span>
                  ) : (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">Pending</span>
                  )}
                </td>
              </tr>
            ))}
            {(vendors ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                  No vendors yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
