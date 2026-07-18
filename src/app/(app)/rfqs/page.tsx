import Link from "next/link";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { ScaleIcon } from "@/components/icons";
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
      <PageHeader title="Requests for Quote" description="Compare vendor quotes before committing to a purchase order." />

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <EmptyState icon={<ScaleIcon />} title="No RFQs yet" description="Start one from an approved request to compare vendor quotes." />
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/70 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Request #</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Quotes</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((rfq) => (
                <tr key={rfq.id} className="transition-colors hover:bg-blue-50/40">
                  <td className="px-4 py-3">
                    <Link href={`/rfqs/${rfq.id}`} className="font-medium text-blue-700 hover:underline">
                      {rfq.requests?.request_number ?? "—"}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-zinc-700">{rfq.requests?.description ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-700">{countMap.get(rfq.id) ?? 0}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={rfq.status} />
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
