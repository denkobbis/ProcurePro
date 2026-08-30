import { getCurrentProfile, ADMIN_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBudgetUsageForAll } from "@/lib/budget";
import { formatNaira } from "@/lib/money";
import { createBudget } from "@/app/actions/budgets";
import { Button } from "@/components/Button";
import MoneyInput from "@/components/MoneyInput";
import EmptyState from "@/components/EmptyState";
import { WalletIcon } from "@/components/icons";
import { RecordSection } from "@/components/RecordPanels";
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

  const usageByKey = await getBudgetUsageForAll(supabase, budgets ?? []);
  const rows = (budgets ?? []).map((b: Budget) => ({
    budget: b,
    usage: usageByKey.get(`${b.department_id}::${b.category}`) ?? { committed: 0, spent: 0 },
  }));

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-[38px] font-semibold leading-none tracking-tight text-zinc-900 dark:text-zinc-100">Budgets</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Allocated caps by department and category, with committed and spent tracked live.</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <EmptyState icon={<WalletIcon />} title="No budgets set up yet" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rows.map(({ budget, usage }) => {
            const used = usage.committed + usage.spent;
            const pctUsed = budget.allocated_amount > 0 ? Math.min(100, (used / budget.allocated_amount) * 100) : 0;
            const over = used > budget.allocated_amount;
            return (
              <div key={budget.id} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{budget.category}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {deptMap.get(budget.department_id) ?? "—"} · {budget.period_start} → {budget.period_end}
                    </div>
                  </div>
                  {budget.hard_block && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">Hard block</span>}
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div className={`h-full transition-all ${over ? "bg-red-600" : pctUsed > 80 ? "bg-amber-500" : "bg-brand-600"}`} style={{ width: `${pctUsed}%` }} />
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div className="col-span-2 flex justify-between">
                    <dt className="text-zinc-500 dark:text-zinc-400">Allocated</dt>
                    <dd className="tabular-nums text-zinc-900 dark:text-zinc-100">{formatNaira(budget.allocated_amount)}</dd>
                  </div>
                  <div className="col-span-2 flex justify-between">
                    <dt className="text-zinc-500 dark:text-zinc-400">Committed (pending requests)</dt>
                    <dd className="tabular-nums text-zinc-900 dark:text-zinc-100">{formatNaira(usage.committed)}</dd>
                  </div>
                  <div className="col-span-2 flex justify-between">
                    <dt className="text-zinc-500 dark:text-zinc-400">Spent (POs raised)</dt>
                    <dd className="tabular-nums text-zinc-900 dark:text-zinc-100">{formatNaira(usage.spent)}</dd>
                  </div>
                  <div className="col-span-2 flex justify-between border-t border-zinc-100 pt-1 font-medium dark:border-zinc-800">
                    <dt className={over ? "text-red-600 dark:text-red-400" : "text-zinc-700 dark:text-zinc-300"}>Remaining</dt>
                    <dd className={`tabular-nums ${over ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-100"}`}>{formatNaira(budget.allocated_amount - used)}</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      )}

      {isAdmin && (
        <RecordSection title="Allocate a budget">
          <form action={createBudget} className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
            <select name="department_id" required className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              <option value="">Department...</option>
              {(departments ?? []).map((d: Department) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input name="category" required placeholder="Category (e.g. Office Supplies)" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            <select name="period" defaultValue="monthly" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
            <MoneyInput name="allocated_amount" required placeholder="Allocated amount (₦)" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400">Period start</label>
              <input name="period_start" type="date" required className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400">Period end</label>
              <input name="period_end" type="date" required className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
            <label className="sm:col-span-2 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input type="checkbox" name="hard_block" className="rounded border-zinc-300 dark:border-zinc-700" />
              Hard block — refuse submission once this budget is exceeded (otherwise it&apos;s a soft warning)
            </label>
            <Button type="submit" className="sm:col-span-2">Save budget</Button>
          </form>
        </RecordSection>
      )}
    </div>
  );
}
