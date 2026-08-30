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

  // total_amount_ngn + freight/duty gives the true landed cost regardless of
  // the PO's own currency, so multi-currency POs roll up correctly into a
  // single NGN-denominated budget. Draft POs are excluded from "spent" — a
  // draft hasn't been sent to a vendor yet, is still freely editable/
  // cancelable, and isn't a real commitment; counting it here would double
  // it against the request's own "committed" figure above.
  const { data: poRows } = await supabase
    .from("purchase_orders")
    .select("total_amount_ngn, freight_cost_ngn, customs_duty_ngn, requests!inner(department_id, category)")
    .eq("requests.department_id", departmentId)
    .eq("requests.category", category)
    .neq("status", "draft");
  const spent = (poRows ?? []).reduce(
    // Postgres numeric columns come back from the Supabase client as strings
    // (see vendor-score.ts) — Number(...) each one, or `+` silently
    // concatenates instead of adding and every budget check downstream breaks.
    (sum: number, r: { total_amount_ngn: number; freight_cost_ngn: number; customs_duty_ngn: number }) =>
      sum + Number(r.total_amount_ngn) + Number(r.freight_cost_ngn) + Number(r.customs_duty_ngn),
    0
  );

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

export interface BudgetUsage {
  committed: number;
  spent: number;
}

function usageKey(departmentId: string, category: string): string {
  return `${departmentId}::${category}`;
}

// Batched equivalent of calling checkBudget() once per row on a list of
// budgets — two queries total instead of ~2 per budget, then grouped by
// (department_id, category) in memory. Use this on any page rendering many
// budgets at once (e.g. /budgets); checkBudget itself stays the right tool
// for a single live check (e.g. validating one new request).
export async function getBudgetUsageForAll(
  supabase: SupabaseClient,
  budgets: Array<{ department_id: string; category: string }>
): Promise<Map<string, BudgetUsage>> {
  const usage = new Map<string, BudgetUsage>();
  for (const b of budgets) usage.set(usageKey(b.department_id, b.category), { committed: 0, spent: 0 });

  const departmentIds = [...new Set(budgets.map((b) => b.department_id))];
  if (departmentIds.length === 0) return usage;

  const [{ data: requestRows }, { data: poRows }] = await Promise.all([
    supabase
      .from("requests")
      .select("department_id, category, qty, est_unit_cost")
      .in("department_id", departmentIds)
      .in("status", ["submitted", "under_review", "approved"]),
    supabase
      .from("purchase_orders")
      .select("total_amount_ngn, freight_cost_ngn, customs_duty_ngn, requests!inner(department_id, category)")
      .in("requests.department_id", departmentIds)
      .neq("status", "draft"),
  ]);

  for (const r of (requestRows ?? []) as { department_id: string; category: string; qty: number; est_unit_cost: number }[]) {
    const entry = usage.get(usageKey(r.department_id, r.category));
    if (entry) entry.committed += Number(r.qty) * Number(r.est_unit_cost);
  }

  for (const r of (poRows ?? []) as {
    total_amount_ngn: number;
    freight_cost_ngn: number;
    customs_duty_ngn: number;
    requests: { department_id: string; category: string } | { department_id: string; category: string }[] | null;
  }[]) {
    const req = Array.isArray(r.requests) ? r.requests[0] : r.requests;
    if (!req) continue;
    const entry = usage.get(usageKey(req.department_id, req.category));
    if (entry) entry.spent += Number(r.total_amount_ngn) + Number(r.freight_cost_ngn) + Number(r.customs_duty_ngn);
  }

  return usage;
}
