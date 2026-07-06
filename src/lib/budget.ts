import type { SupabaseClient } from "@supabase/supabase-js";

export interface BudgetCheckResult {
  budgetId: string | null;
  allocated: number;
  committed: number;
  spent: number;
  available: number;
  wouldExceed: boolean;
  hardBlock: boolean;
}

// Finds the budget row covering today for this department/category, then sums
// committed spend (live requests not yet a PO) and actual spend (POs already
// raised), excluding `excludeRequestId` so re-checking an existing request
// doesn't double-count itself.
export async function checkBudget(
  supabase: SupabaseClient,
  departmentId: string,
  category: string,
  additionalAmount: number,
  excludeRequestId?: string
): Promise<BudgetCheckResult> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: budget } = await supabase
    .from("budgets")
    .select("*")
    .eq("department_id", departmentId)
    .eq("category", category)
    .lte("period_start", today)
    .gte("period_end", today)
    .maybeSingle();

  if (!budget) {
    return { budgetId: null, allocated: 0, committed: 0, spent: 0, available: Infinity, wouldExceed: false, hardBlock: false };
  }

  let committedQuery = supabase
    .from("requests")
    .select("qty, est_unit_cost")
    .eq("department_id", departmentId)
    .eq("category", category)
    .in("status", ["submitted", "under_review", "approved"]);
  if (excludeRequestId) committedQuery = committedQuery.neq("id", excludeRequestId);
  const { data: committedRows } = await committedQuery;
  const committed = (committedRows ?? []).reduce((sum, r) => sum + r.qty * r.est_unit_cost, 0);

  const { data: poRows } = await supabase
    .from("purchase_orders")
    .select("total_amount, requests!inner(department_id, category)")
    .eq("requests.department_id", departmentId)
    .eq("requests.category", category);
  const spent = (poRows ?? []).reduce((sum: number, r: { total_amount: number }) => sum + r.total_amount, 0);

  const available = budget.allocated_amount - committed - spent;
  const wouldExceed = additionalAmount > available;

  return {
    budgetId: budget.id,
    allocated: budget.allocated_amount,
    committed,
    spent,
    available,
    wouldExceed,
    hardBlock: budget.hard_block,
  };
}
