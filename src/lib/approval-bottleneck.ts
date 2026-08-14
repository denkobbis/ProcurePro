import type { SupabaseClient } from "@supabase/supabase-js";

export interface BottleneckFlag {
  waitingDays: number;
  historicalAvgDays: number | null;
  isSlow: boolean;
}

interface ApprovalRow {
  id: string;
  request_id: string;
  step_order: number;
  approver_role: string;
  status: string;
  acted_at: string | null;
  created_at: string;
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
 */
export async function getBottleneckFlags(
  supabase: SupabaseClient,
  pending: Array<{ id: string; request_id: string; step_order: number; approver_role: string; created_at: string }>
): Promise<Map<string, BottleneckFlag>> {
  const flags = new Map<string, BottleneckFlag>();
  if (pending.length === 0) return flags;

  const { data: decided } = await supabase
    .from("approvals")
    .select("id, request_id, step_order, approver_role, status, acted_at, created_at")
    .in("status", ["approved", "rejected"])
    .not("acted_at", "is", null);

  const decidedList = (decided ?? []) as ApprovalRow[];
  const priorStepActedAt = new Map<string, string>();
  for (const a of decidedList) priorStepActedAt.set(`${a.request_id}:${a.step_order}`, a.acted_at!);

  const bucketWaits = new Map<string, number[]>();
  for (const a of decidedList) {
    const baseline = a.step_order === 1 ? a.created_at : priorStepActedAt.get(`${a.request_id}:${a.step_order - 1}`);
    if (!baseline) continue;
    const wait = daysBetween(a.acted_at!, baseline);
    if (wait < 0) continue;
    const key = `${a.approver_role}:${a.step_order}`;
    const arr = bucketWaits.get(key) ?? [];
    arr.push(wait);
    bucketWaits.set(key, arr);
  }

  const bucketAvg = new Map<string, number>();
  for (const [key, waits] of bucketWaits) bucketAvg.set(key, waits.reduce((a, b) => a + b, 0) / waits.length);

  const now = new Date().toISOString();
  for (const p of pending) {
    const baseline = p.step_order === 1 ? p.created_at : priorStepActedAt.get(`${p.request_id}:${p.step_order - 1}`);
    if (!baseline) continue;
    const waitingDays = Math.round(daysBetween(now, baseline) * 10) / 10;
    const historicalAvgDays = bucketAvg.get(`${p.approver_role}:${p.step_order}`) ?? null;
    const threshold = historicalAvgDays != null ? Math.max(historicalAvgDays * SLOW_MULTIPLIER, 1) : FALLBACK_THRESHOLD_DAYS;
    flags.set(p.id, { waitingDays, historicalAvgDays: historicalAvgDays != null ? Math.round(historicalAvgDays * 10) / 10 : null, isSlow: waitingDays > threshold });
  }

  return flags;
}
