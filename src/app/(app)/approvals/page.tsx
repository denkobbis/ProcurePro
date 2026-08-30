import Link from "next/link";
import { getCurrentProfile, requireRole, APPROVER_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import { actOnApproval, createDelegation, removeDelegation } from "@/app/actions/approvals";
import { Button } from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import { CheckCircleIcon } from "@/components/icons";
import { getBottleneckFlags } from "@/lib/approval-bottleneck";
import type { Profile } from "@/lib/database.types";

interface ActionableApproval {
  id: string;
  request_id: string;
  step_order: number;
  approver_role: string;
  request_number: string;
  description: string;
  requester_id: string;
  qty: number;
  est_unit_cost: number;
  created_at: string;
}

export default async function ApprovalsPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, APPROVER_ROLES);

  const supabase = await createClient();
  const { data: approvals } = await supabase.from("v_actionable_approvals").select("*").order("created_at");

  // The view can still include a request whose requester's role happens to
  // match the step's approver_role (visible to them for transparency via
  // approvals_select) — act_on_approval blocks them from acting on it
  // regardless, so don't show it as something they can act on here.
  const list = ((approvals ?? []) as ActionableApproval[]).filter((a) => a.requester_id !== profile.id);
  const bottleneckFlags = await getBottleneckFlags(supabase, list);
  const requesterIds = [...new Set(list.map((a) => a.requester_id))];
  const { data: requesters } = requesterIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", requesterIds)
    : { data: [] as Pick<Profile, "id" | "full_name">[] };
  const nameMap = new Map((requesters ?? []).map((p) => [p.id, p.full_name]));

  const { data: myDelegations } = await supabase
    .from("delegations")
    .select("*")
    .eq("approver_id", profile.id)
    .order("start_date", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[38px] font-semibold leading-none tracking-tight text-zinc-900 dark:text-zinc-100">Approvals</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {list.length} request{list.length === 1 ? "" : "s"} waiting on a decision from you.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {list.length === 0 ? (
          <EmptyState icon={<CheckCircleIcon />} title="Nothing waiting on you right now" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                  <th className="px-5 py-3">Request</th>
                  <th className="px-4 py-3">Requester</th>
                  <th className="px-4 py-3">Waiting</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {list.map((a) => {
                  const flag = bottleneckFlags.get(a.id);
                  return (
                    <tr key={a.id} className="transition-colors hover:bg-brand-50/40 dark:hover:bg-brand-500/10">
                      <td className="px-5 py-3">
                        <Link href={`/requests/${a.request_id}`} className="block font-medium text-zinc-900 hover:text-brand-700 dark:text-zinc-100 dark:hover:text-brand-400">
                          {a.description}
                        </Link>
                        <div className="mt-0.5 text-[13px] text-zinc-400 dark:text-zinc-500">{a.request_number}</div>
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{nameMap.get(a.requester_id) ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm tabular-nums ${flag?.isSlow ? "font-medium text-amber-700 dark:text-amber-400" : "text-zinc-500 dark:text-zinc-400"}`}>
                          {flag ? `${Math.round(flag.waitingDays)}d` : "—"}
                        </span>
                        {flag?.historicalAvgDays != null && (
                          <span className="ml-1 text-[13px] text-zinc-400 dark:text-zinc-500">usually {flag.historicalAvgDays}d</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-[17px] tabular-nums text-zinc-900 dark:text-zinc-100">
                        {formatNaira(a.qty * a.est_unit_cost)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <form action={actOnApproval}>
                            <input type="hidden" name="approval_id" value={a.id} />
                            <input type="hidden" name="action" value="approved" />
                            <button className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-700">
                              Approve
                            </button>
                          </form>
                          <form action={actOnApproval}>
                            <input type="hidden" name="approval_id" value={a.id} />
                            <input type="hidden" name="action" value="rejected" />
                            <button className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                              Reject
                            </button>
                          </form>
                          <form action={actOnApproval}>
                            <input type="hidden" name="approval_id" value={a.id} />
                            <input type="hidden" name="action" value="info_requested" />
                            <button className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                              Ask
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-zinc-100 px-5 py-3 text-[13px] text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
          Only steps currently assigned to your role are shown — decided items move to the request&apos;s own timeline.
        </div>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Delegate my approvals</h2>
        <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
          Assign a substitute to act on your approval steps for a date range (e.g. while on leave).
        </p>
        <form action={createDelegation} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-400">Delegate&apos;s email</label>
            <input name="delegate_email" type="email" required className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-400">Start date</label>
            <input name="start_date" type="date" required className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-400">End date</label>
            <input name="end_date" type="date" required className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
          </div>
          <Button type="submit">Delegate</Button>
        </form>

        <ul className="mt-4 space-y-1 text-sm">
          {(myDelegations ?? []).map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-md border border-zinc-100 px-3 py-2 dark:border-zinc-800">
              <span className="text-zinc-700 dark:text-zinc-300">
                {d.start_date} → {d.end_date}
              </span>
              <form action={removeDelegation}>
                <input type="hidden" name="delegation_id" value={d.id} />
                <button className="text-xs text-red-600 hover:underline dark:text-red-400">Remove</button>
              </form>
            </li>
          ))}
          {(myDelegations ?? []).length === 0 && <li className="text-zinc-400 dark:text-zinc-500">No delegations set.</li>}
        </ul>
      </section>
    </div>
  );
}
