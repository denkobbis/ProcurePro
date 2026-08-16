import Link from "next/link";
import { getCurrentProfile, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import { getBottleneckFlags } from "@/lib/approval-bottleneck";
import { ButtonLink } from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import { DocumentIcon } from "@/components/icons";
import RequestsTable, { type RequestRow } from "./RequestsTable";
import type { PurchaseRequest, Profile, Department, PurchaseOrder } from "@/lib/database.types";

function daysSince(iso: string): number {
  return Math.round((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

function stageFilledFor(status: string, po: PurchaseOrder | undefined): number {
  if (status === "draft") return 0;
  if (status === "submitted" || status === "under_review") return 1;
  if (status === "rejected") return 1;
  if (status === "approved") return 2;
  if (status === "converted_to_po") {
    if (!po) return 2;
    if (["fully_received", "closed"].includes(po.status)) return 4;
    return 3;
  }
  return 0;
}

export default async function RequestsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const seeAll = PROCUREMENT_ROLES.includes(profile.role);
  let query = supabase.from("requests").select("*").order("created_at", { ascending: false });
  if (!seeAll) {
    query = query.or(`requester_id.eq.${profile.id},department_id.eq.${profile.department_id}`);
  }
  const { data: requests } = await query;
  const rows = (requests ?? []) as PurchaseRequest[];

  const requesterIds = [...new Set(rows.map((r) => r.requester_id))];
  const departmentIds = [...new Set(rows.map((r) => r.department_id))];
  const requestIds = rows.map((r) => r.id);

  const [{ data: requesters }, { data: departments }, { data: pos }] = await Promise.all([
    requesterIds.length ? supabase.from("profiles").select("id, full_name").in("id", requesterIds) : Promise.resolve({ data: [] as Pick<Profile, "id" | "full_name">[] }),
    departmentIds.length ? supabase.from("departments").select("id, name").in("id", departmentIds) : Promise.resolve({ data: [] as Pick<Department, "id" | "name">[] }),
    requestIds.length ? supabase.from("purchase_orders").select("*").in("request_id", requestIds) : Promise.resolve({ data: [] as PurchaseOrder[] }),
  ]);

  const nameMap = new Map((requesters ?? []).map((p) => [p.id, p.full_name]));
  const deptMap = new Map((departments ?? []).map((d) => [d.id, d.name]));
  const poMap = new Map((pos ?? []).map((po) => [po.request_id, po as PurchaseOrder]));

  const underReviewIds = rows.filter((r) => r.status === "under_review").map((r) => r.id);
  const { data: pendingApprovals } = underReviewIds.length
    ? await supabase.from("approvals").select("id, request_id, step_order, approver_role, created_at").eq("status", "pending").in("request_id", underReviewIds)
    : { data: [] as Array<{ id: string; request_id: string; step_order: number; approver_role: string; created_at: string }> };
  const bottleneckFlags = await getBottleneckFlags(supabase, pendingApprovals ?? []);
  const slowRequestIds = new Set(
    [...bottleneckFlags.entries()]
      .filter(([, f]) => f.isSlow)
      .map(([id]) => (pendingApprovals ?? []).find((a) => a.id === id)?.request_id)
      .filter(Boolean)
  );

  const tableRows: RequestRow[] = rows.map((r) => ({
    id: r.id,
    requestNumber: r.request_number,
    description: r.description,
    departmentName: deptMap.get(r.department_id) ?? "—",
    requesterName: nameMap.get(r.requester_id) ?? "—",
    status: r.status,
    stageFilled: stageFilledFor(r.status, poMap.get(r.id)),
    ageDays: daysSince(r.created_at),
    ageAmber: slowRequestIds.has(r.id),
    valueLabel: formatNaira(r.qty * r.est_unit_cost),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[38px] font-semibold leading-none tracking-tight text-zinc-900 dark:text-zinc-100">Requests</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Every purchase request from submission through receiving.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/requests/export" className="text-sm font-medium text-zinc-500 hover:text-brand-700 hover:underline dark:text-zinc-400 dark:hover:text-brand-400">
            Export CSV
          </Link>
          <ButtonLink href="/requests/new">New request</ButtonLink>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <EmptyState
            icon={<DocumentIcon />}
            title="No requests yet"
            description="Once you or your team submit a purchase request, it'll show up here."
            action={<ButtonLink href="/requests/new" size="sm">New request</ButtonLink>}
          />
        </div>
      ) : (
        <RequestsTable rows={tableRows} />
      )}
    </div>
  );
}
