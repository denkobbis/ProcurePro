import Link from "next/link";
import { getCurrentProfile, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/PageHeader";
import { ButtonLink } from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import { DocumentIcon } from "@/components/icons";
import type { PurchaseRequest, Profile } from "@/lib/database.types";

export default async function RequestsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const seeAll = PROCUREMENT_ROLES.includes(profile.role);
  let query = supabase.from("requests").select("*").order("created_at", { ascending: false });
  if (!seeAll) {
    query = query.or(`requester_id.eq.${profile.id},department_id.eq.${profile.department_id}`);
  }
  const { data: requests } = await query;

  const requesterIds = [...new Set((requests ?? []).map((r: PurchaseRequest) => r.requester_id))];
  const { data: requesters } = requesterIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", requesterIds)
    : { data: [] as Pick<Profile, "id" | "full_name">[] };
  const nameMap = new Map((requesters ?? []).map((p) => [p.id, p.full_name]));
  const rows = requests ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Purchase requests" actions={<ButtonLink href="/requests/new">New request</ButtonLink>} />

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <EmptyState
            icon={<DocumentIcon />}
            title="No requests yet"
            description="Once you or your team submit a purchase request, it'll show up here."
            action={<ButtonLink href="/requests/new" size="sm">New request</ButtonLink>}
          />
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/70 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Request #</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Requester</th>
                <th className="px-4 py-3">Total est.</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r: PurchaseRequest) => (
                <tr key={r.id} className="transition-colors hover:bg-blue-50/40">
                  <td className="px-4 py-3">
                    <Link href={`/requests/${r.id}`} className="font-medium text-blue-700 hover:underline">
                      {r.request_number}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-zinc-700">{r.description}</td>
                  <td className="px-4 py-3 text-zinc-700">{nameMap.get(r.requester_id) ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-700">{formatNaira(r.qty * r.est_unit_cost)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
