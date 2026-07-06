import Link from "next/link";
import { getCurrentProfile, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Purchase requests</h1>
        <Link href="/requests/new" className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800">
          New request
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2">Request #</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Requester</th>
              <th className="px-4 py-2">Total est.</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {(requests ?? []).map((r: PurchaseRequest) => (
              <tr key={r.id} className="border-t border-zinc-100 hover:bg-zinc-50">
                <td className="px-4 py-2">
                  <Link href={`/requests/${r.id}`} className="font-medium text-zinc-900 hover:underline">
                    {r.request_number}
                  </Link>
                </td>
                <td className="max-w-xs truncate px-4 py-2 text-zinc-700">{r.description}</td>
                <td className="px-4 py-2 text-zinc-700">{nameMap.get(r.requester_id) ?? "—"}</td>
                <td className="px-4 py-2 text-zinc-700">{formatNaira(r.qty * r.est_unit_cost)}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-2 text-zinc-500">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {(requests ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">
                  No requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
