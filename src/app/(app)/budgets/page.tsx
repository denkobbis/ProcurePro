import { getCurrentProfile, ADMIN_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { checkBudget } from "@/lib/budget";
import { formatNaira } from "@/lib/money";
import { createBudget } from "@/app/actions/budgets";
import type { Budget, Department } from "@/lib/database.types";

export default async function BudgetsPage() {
  const profile = await getCurrentProfile();
  const isAdmin = ADMIN_ROLES.includes(profile.role);
  const supabase = await createClient();

  const [{ data: budgets }, { data: departments }] = await Promise.all([
    supabase.from("budgets").select("*").order("period_start", { ascending: false }),
    supabase.from("departments").select("*").order("name"),
  ]);
  const deptMap = new Map((departments ?? []).map((d: Department) => [d.id, d.name]));

  const rows = await Promise.all(
    (budgets ?? []).map(async (b: Budget) => {
      const usage = await checkBudget(supabase, b.department_id, b.category, 0);
      return { budget: b, usage };
    })
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900">Budgets</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {rows.map(({ budget, usage }) => {
          const used = usage.committed + usage.spent;
          const pct = budget.allocated_amount > 0 ? Math.min(100, (used / budget.allocated_amount) * 100) : 0;
          const over = used > budget.allocated_amount;
          return (
            <div key={budget.id} className="rounded-lg border border-zinc-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-zinc-900">{budget.category}</div>
                  <div className="text-xs text-zinc-500">
                    {deptMap.get(budget.department_id) ?? "—"} · {budget.period_start} → {budget.period_end}
                  </div>
                </div>
                {budget.hard_block && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Hard block</span>
                )}
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full ${over ? "bg-red-600" : pct > 80 ? "bg-amber-500" : "bg-green-600"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div className="flex justify-between col-span-2">
                  <dt className="text-zinc-500">Allocated</dt>
                  <dd className="text-zinc-900">{formatNaira(budget.allocated_amount)}</dd>
                </div>
                <div className="flex justify-between col-span-2">
                  <dt className="text-zinc-500">Committed (pending requests)</dt>
                  <dd className="text-zinc-900">{formatNaira(usage.committed)}</dd>
                </div>
                <div className="flex justify-between col-span-2">
                  <dt className="text-zinc-500">Spent (POs raised)</dt>
                  <dd className="text-zinc-900">{formatNaira(usage.spent)}</dd>
                </div>
                <div className="flex justify-between col-span-2 border-t border-zinc-100 pt-1 font-medium">
                  <dt className={over ? "text-red-600" : "text-zinc-700"}>Remaining</dt>
                  <dd className={over ? "text-red-600" : "text-zinc-900"}>
                    {formatNaira(budget.allocated_amount - used)}
                  </dd>
                </div>
              </dl>
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-zinc-400">No budgets set up yet.</p>}
      </div>

      {isAdmin && (
        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 font-medium text-zinc-900">Allocate a budget</h2>
          <form action={createBudget} className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
            <select name="department_id" required className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm">
              <option value="">Department...</option>
              {(departments ?? []).map((d: Department) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input name="category" required placeholder="Category (e.g. Office Supplies)" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
            <select name="period" defaultValue="monthly" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm">
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
            <input name="allocated_amount" type="number" min="0" step="0.01" required placeholder="Allocated amount (₦)" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
            <div>
              <label className="block text-xs text-zinc-500">Period start</label>
              <input name="period_start" type="date" required className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500">Period end</label>
              <input name="period_end" type="date" required className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
            </div>
            <label className="sm:col-span-2 flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" name="hard_block" className="rounded border-zinc-300" />
              Hard block — refuse submission once this budget is exceeded (otherwise it&apos;s a soft warning)
            </label>
            <button className="sm:col-span-2 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800">
              Save budget
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
