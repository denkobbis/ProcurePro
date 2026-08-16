"use client";

import { useState } from "react";
import ListTabs from "@/components/ListTabs";
import { deactivateUser, grantRigSourceAccess } from "@/app/actions/users";

export interface UserRow {
  id: string;
  fullName: string;
  email: string;
  role: string;
  departmentName: string;
  isActive: boolean;
  isSelf: boolean;
  rigsourceInvitedAt: string | null;
}

const TABS = [
  { key: "all", label: "All", match: () => true },
  { key: "active", label: "Active", match: (u: UserRow) => u.isActive },
  { key: "deactivated", label: "Deactivated", match: (u: UserRow) => !u.isActive },
] as const;

export default function UsersTable({ rows, rigsourceEnabled }: { rows: UserRow[]; rigsourceEnabled: boolean }) {
  const [active, setActive] = useState<string>("all");
  const tabs = TABS.map((t) => ({ key: t.key, label: t.label, count: rows.filter(t.match).length }));
  const activeMatch = TABS.find((t) => t.key === active)?.match ?? (() => true);
  const shown = rows.filter(activeMatch);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="px-5 pt-1">
        <ListTabs tabs={tabs} active={active} onChange={setActive} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              <th className="px-5 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Status</th>
              {rigsourceEnabled && <th className="px-4 py-3">RigSource</th>}
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {shown.map((u) => (
              <tr key={u.id} className="transition-colors hover:bg-brand-50/40">
                <td className="px-5 py-3 font-medium text-zinc-900">{u.fullName}</td>
                <td className="px-4 py-3 text-zinc-700">{u.email}</td>
                <td className="px-4 py-3 capitalize text-zinc-700">{u.role.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-zinc-700">{u.departmentName}</td>
                <td className="px-4 py-3">
                  {u.isActive ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
                  ) : (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">Deactivated</span>
                  )}
                </td>
                {rigsourceEnabled && (
                  <td className="px-4 py-3">
                    {u.rigsourceInvitedAt ? (
                      <span className="text-xs text-zinc-500">Invited {new Date(u.rigsourceInvitedAt).toLocaleDateString()}</span>
                    ) : (
                      <form action={grantRigSourceAccess}>
                        <input type="hidden" name="user_id" value={u.id} />
                        <button className="text-xs font-medium text-brand-600 hover:underline">Grant access</button>
                      </form>
                    )}
                  </td>
                )}
                <td className="px-4 py-3">
                  {u.isActive && !u.isSelf && (
                    <form action={deactivateUser}>
                      <input type="hidden" name="user_id" value={u.id} />
                      <button className="text-xs font-medium text-red-600 hover:underline">Deactivate</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
