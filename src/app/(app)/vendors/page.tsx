import Link from "next/link";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import { ButtonLink } from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import { BuildingIcon } from "@/components/icons";
import type { Vendor } from "@/lib/database.types";

export default async function VendorsPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  const supabase = await createClient();
  const { data: vendors } = await supabase.from("vendors").select("*").order("name");
  const rows = vendors ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Vendors" actions={<ButtonLink href="/vendors/new">Add vendor</ButtonLink>} />

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <EmptyState icon={<BuildingIcon />} title="No vendors yet" action={<ButtonLink href="/vendors/new" size="sm">Add vendor</ButtonLink>} />
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/70 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Payment terms</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3">Approved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((v: Vendor) => (
                <tr key={v.id} className="transition-colors hover:bg-blue-50/40">
                  <td className="px-4 py-3">
                    <Link href={`/vendors/${v.id}`} className="font-medium text-blue-700 hover:underline">
                      {v.name}
                    </Link>
                    {v.ncdmb_compliant && (
                      <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">NCDMB</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{v.category ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-700">{v.contact_email ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-700">{v.payment_terms ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-700">{v.default_currency}</td>
                  <td className="px-4 py-3">
                    {v.is_approved ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Approved</span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">Pending</span>
                    )}
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
