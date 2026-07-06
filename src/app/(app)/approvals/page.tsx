import { getCurrentProfile, requireRole, APPROVER_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import { actOnApproval, createDelegation, removeDelegation } from "@/app/actions/approvals";
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
}

export default async function ApprovalsPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, APPROVER_ROLES);

  const supabase = await createClient();
  const { data: approvals } = await supabase
    .from("v_actionable_approvals")
    .select("*")
    .order("created_at");

  const list = (approvals ?? []) as ActionableApproval[];
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
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-zinc-900">Approvals awaiting you</h1>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2">Request #</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Requester</th>
              <th className="px-4 py-2">Total est.</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id} className="border-t border-zinc-100">
                <td className="px-4 py-2 font-medium text-zinc-900">
                  <a href={`/requests/${a.request_id}`} className="hover:underline">
                    {a.request_number}
                  </a>
                </td>
                <td className="max-w-xs truncate px-4 py-2 text-zinc-700">{a.description}</td>
                <td className="px-4 py-2 text-zinc-700">{nameMap.get(a.requester_id) ?? "—"}</td>
                <td className="px-4 py-2 text-zinc-700">{formatNaira(a.qty * a.est_unit_cost)}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-2">
                    <form action={actOnApproval}>
                      <input type="hidden" name="approval_id" value={a.id} />
                      <input type="hidden" name="action" value="approved" />
                      <button className="rounded-md bg-green-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-800">
                        Approve
                      </button>
                    </form>
                    <form action={actOnApproval}>
                      <input type="hidden" name="approval_id" value={a.id} />
                      <input type="hidden" name="action" value="rejected" />
                      <button className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700">
                        Reject
                      </button>
                    </form>
                    <form action={actOnApproval}>
                      <input type="hidden" name="approval_id" value={a.id} />
                      <input type="hidden" name="action" value="info_requested" />
                      <button className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50">
                        Request info
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                  Nothing waiting on you right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-1 font-medium text-zinc-900">Delegate my approvals</h2>
        <p className="mb-3 text-sm text-zinc-500">
          Assign a substitute to act on your approval steps for a date range (e.g. while on leave).
        </p>
        <form action={createDelegation} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-zinc-500">Delegate&apos;s email</label>
            <input name="delegate_email" type="email" required className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500">Start date</label>
            <input name="start_date" type="date" required className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500">End date</label>
            <input name="end_date" type="date" required className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
          </div>
          <button className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800">
            Delegate
          </button>
        </form>

        <ul className="mt-4 space-y-1 text-sm">
          {(myDelegations ?? []).map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-md border border-zinc-100 px-3 py-2">
              <span className="text-zinc-700">
                {d.start_date} → {d.end_date}
              </span>
              <form action={removeDelegation}>
                <input type="hidden" name="delegation_id" value={d.id} />
                <button className="text-xs text-red-600 hover:underline">Remove</button>
              </form>
            </li>
          ))}
          {(myDelegations ?? []).length === 0 && <li className="text-zinc-400">No delegations set.</li>}
        </ul>
      </section>
    </div>
  );
}
