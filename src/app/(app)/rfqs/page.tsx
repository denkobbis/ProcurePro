import Link from "next/link";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/StatusBadge";
import type { Rfq } from "@/lib/database.types";

export default async function RfqsPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  const supabase = await createClient();
  const { data: rfqs } = await supabase
    .from("rfqs")
    .select("*, requests(request_number, description)")
    .order("created_at", { ascending: false });

  const rows = (rfqs ?? []) as (Rfq & { requests: { request_number: string; description: string } | null })[];

  const rfqIds = rows.map((r) => r.id);
  const { data: quoteCounts } = rfqIds.length
    ? await supabase.from("rfq_quotes").select("rfq_id").in("rfq_id", rfqIds)
    : { data: [] as { rfq_id: string }[] };
  const countMap = new Map<string, number>();
  for (const q of quoteCounts ?? []) countMap.set(q.rfq_id, (countMap.get(q.rfq_id) ?? 0) + 1);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-900">Requests for Quote</h1>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2">Request #</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Quotes</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((rfq) => (
              <tr key={rfq.id} className="border-t border-zinc-100 hover:bg-zinc-50">
                <td className="px-4 py-2">
                  <Link href={`/rfqs/${rfq.id}`} className="font-medium text-zinc-900 hover:underline">
                    {rfq.requests?.request_number ?? "—"}
                  </Link>
                </td>
                <td className="max-w-xs truncate px-4 py-2 text-zinc-700">{rfq.requests?.description ?? "—"}</td>
                <td className="px-4 py-2 text-zinc-700">{countMap.get(rfq.id) ?? 0}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={rfq.status} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-400">
                  No RFQs yet. Start one from an approved request.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
