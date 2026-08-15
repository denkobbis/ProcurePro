import type { SupabaseClient } from "@supabase/supabase-js";

export interface BottleneckFlag {
  waitingDays: number;
  historicalAvgDays: number | null;
  isSlow: boolean;
}

const FALLBACK_THRESHOLD_DAYS = 3;
const SLOW_MULTIPLIER = 1.5;

function daysBetween(a: string, b: string) {
  return (new Date(a).getTime() - new Date(b).getTime()) / (24 * 60 * 60 * 1000);
}

/**
 * Flags pending approvals that have been waiting noticeably longer than this
 * org's own historical average for the same approver role + step — plain
 * statistics over data already recorded, no LLM involved.
 *
 * The historical average comes from v_approval_wait_stats (migration 0029),
 * one row per (role, step) bucket computed by Postgres, instead of pulling
 * every decided approval ever into JS on every render. The per-pending-item
 * "waiting since" baseline still needs the previous step's acted_at, but
 * that lookup is scoped to just the requests behind the (small) pending set
 * passed in, not the full historical table.
 */
export async function getBottleneckFlags(
  supabase: SupabaseClient,
  pending: Array<{ id: string; request_id: string; step_order: number; approver_role: string; created_at: string }>
): Promise<Map<string, BottleneckFlag>> {
  const flags = new Map<string, BottleneckFlag>();
  if (pending.length === 0) return flags;

  const [{ data: stats }, { data: priorSteps }] = await Promise.all([
    supabase.from("v_approval_wait_stats").select("approver_role, step_order, avg_wait_days"),
    supabase
      .from("approvals")
      .select("request_id, step_order, acted_at")
      .eq("status", "approved")
      .in(
        "request_id",
        [...new Set(pending.map((p) => p.request_id))]
      ),
  ]);

  // avg_wait_days is a Postgres double precision (avg() of a float division),
  // which the client already returns as a JS number — but coerce defensively
  // since Supabase's numeric-as-string behavior depends on the exact SQL type.
  const statsMap = new Map(
    (stats ?? []).map((s: { approver_role: string; step_order: number; avg_wait_days: number | string | null }) => [
      `${s.approver_role}:${s.step_order}`,
      s.avg_wait_days == null ? null : Number(s.avg_wait_days),
    ])
  );
  const priorStepActedAt = new Map(
    (priorSteps ?? []).map((a: { request_id: string; step_order: number; acted_at: string | null }) => [`${a.request_id}:${a.step_order}`, a.acted_at])
  );

  const now = new Date().toISOString();
  for (const p of pending) {
    const baseline = p.step_order === 1 ? p.created_at : priorStepActedAt.get(`${p.request_id}:${p.step_order - 1}`);
    if (!baseline) continue;
    const waitingDays = Math.round(daysBetween(now, baseline) * 10) / 10;
    const historicalAvgDays = statsMap.get(`${p.approver_role}:${p.step_order}`) ?? null;
    const threshold = historicalAvgDays != null ? Math.max(historicalAvgDays * SLOW_MULTIPLIER, 1) : FALLBACK_THRESHOLD_DAYS;
    flags.set(p.id, { waitingDays, historicalAvgDays: historicalAvgDays != null ? Math.round(historicalAvgDays * 10) / 10 : null, isSlow: waitingDays > threshold });
  }

  return flags;
}
