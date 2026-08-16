import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTodayData } from "@/lib/today";
import { actOnApproval } from "@/app/actions/approvals";
import { ButtonLink } from "@/components/Button";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const data = await getTodayData(supabase, profile);

  const dateLine = new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const monthLabel = new Date().toLocaleDateString("en-NG", { month: "long" });

  return (
    <div className="space-y-[22px]">
      <div>
        <h1 className="text-[38px] font-semibold leading-none tracking-tight text-zinc-900">Today</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {dateLine}
          {data.decisionsCount > 0 && (
            <>
              {" "}
              · {data.decisionsCount} thing{data.decisionsCount === 1 ? "" : "s"} need{data.decisionsCount === 1 ? "s" : ""} a decision from you
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        {data.loop.map((step) => (
          <Link
            key={step.step}
            href={step.href}
            className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-brand-300"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Step {step.step}</span>
              <span className="text-[13px] font-medium tabular-nums text-zinc-400">{step.valueLabel}</span>
            </div>
            <div className="mt-2 text-[44px] font-semibold leading-none tabular-nums text-zinc-900">{step.count}</div>
            <div className="mt-2 text-[15px] font-medium text-zinc-900">{step.label}</div>
            <div className={`mt-0.5 text-[13px] ${step.subTone === "warn" ? "text-amber-700" : "text-zinc-500"}`}>{step.sub}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1.62fr_1fr]">
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <h2 className="text-[15px] font-semibold text-zinc-900">Needs you today</h2>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Ranked by cost of waiting</span>
          </div>

          {data.needsYou.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-zinc-400">Nothing needs a decision from you right now.</p>
          ) : (
            <ul>
              {data.needsYou.map((row) => (
                <li key={row.key} className="group flex flex-col border-b border-zinc-100 last:border-b-0 sm:flex-row">
                  <div className="flex flex-1 min-w-0">
                    <div className={`w-[3px] shrink-0 ${row.severity === "urgent" ? "bg-amber-500" : "bg-zinc-300"}`} />
                    <div className="min-w-0 flex-1 px-4 py-3">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <Link href={row.href} className="text-[13px] font-medium tabular-nums text-zinc-400 hover:text-brand-700">
                          {row.ref}
                        </Link>
                        <Link href={row.href} className="text-[15px] font-medium text-zinc-900 hover:text-brand-700">
                          {row.title}
                        </Link>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            row.severity === "urgent" ? "bg-amber-50 text-amber-700" : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {row.tag}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[13px] text-zinc-500 sm:truncate">{row.evidence}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 px-4 pb-3 pl-[15px] sm:py-3 sm:pl-4">
                    <span className="text-[17px] font-medium tabular-nums text-zinc-900">{row.amountLabel}</span>
                    <div className="flex items-center gap-1.5 opacity-100 transition-opacity sm:opacity-55 sm:group-hover:opacity-100">
                      {row.approvalId && (
                        <form action={actOnApproval}>
                          <input type="hidden" name="approval_id" value={row.approvalId} />
                          <input type="hidden" name="action" value="approved" />
                          <button
                            type="submit"
                            className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-700"
                          >
                            Approve
                          </button>
                        </form>
                      )}
                      <Link href={row.href} className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                        Open
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {data.approvalsWaitingCount > 0 && (
            <div className="border-t border-zinc-100 px-5 py-3">
              <Link href="/approvals" className="text-[13px] font-medium text-brand-700 hover:underline">
                See all {data.approvalsWaitingCount} approval{data.approvalsWaitingCount === 1 ? "" : "s"} waiting on you →
              </Link>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-[18px]">
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold text-zinc-900">Budget, {monthLabel}</h2>
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Committed vs. cap</span>
            </div>
            {data.budgetBars.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-400">No budgets set up for this period yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.budgetBars.map((bar) => (
                  <li key={bar.name}>
                    <div className="flex items-baseline justify-between text-[13px]">
                      <span className="text-zinc-700">{bar.name}</span>
                      <span className={`tabular-nums font-medium ${bar.over ? "text-amber-700" : "text-zinc-500"}`}>
                        ₦{(bar.committed / 1e6).toFixed(1)}m / ₦{(bar.cap / 1e6).toFixed(1)}m
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                      <div
                        className={`h-full rounded-full ${bar.over ? "bg-amber-500" : "bg-brand-600"}`}
                        style={{ width: `${Math.min(100, (bar.committed / Math.max(bar.cap, 1)) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-semibold text-zinc-900">Moved today</h2>
            {data.moved.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-400">Nothing has moved in the last 24 hours.</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {data.moved.map((row, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="min-w-0 truncate text-zinc-700">
                      <span className="font-medium tabular-nums text-zinc-900">{row.ref}</span> {row.text}
                    </span>
                    <span className="shrink-0 text-zinc-400">{row.when}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <ButtonLink href="/requests/new" className="w-full justify-center">
            New purchase request
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
