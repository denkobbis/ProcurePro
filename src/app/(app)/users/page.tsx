import { getCurrentProfile, requireRole, ADMIN_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createDepartment, createUser, deactivateUser } from "@/app/actions/users";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/Button";
import type { Department, Profile } from "@/lib/database.types";

const ROLE_OPTIONS = ["requester", "approver", "procurement_officer", "finance_admin", "super_admin"];

export default async function UsersPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, ADMIN_ROLES);

  const supabase = await createClient();
  const [{ data: departments }, { data: users }] = await Promise.all([
    supabase.from("departments").select("*").order("name"),
    supabase.from("profiles").select("*").order("created_at"),
  ]);

  const deptMap = new Map((departments ?? []).map((d: Department) => [d.id, d.name]));

  return (
    <div className="space-y-8">
      <PageHeader title="Users & Departments" />

      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Departments</h2>
        <ul className="mb-4 flex flex-wrap gap-2">
          {(departments ?? []).map((d: Department) => (
            <li key={d.id} className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700">
              {d.name}
            </li>
          ))}
        </ul>
        <form action={createDepartment} className="flex gap-2">
          <input
            name="name"
            placeholder="New department name"
            required
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
          />
          <Button type="submit" size="sm">Add</Button>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Invite a user</h2>
        <form action={createUser} className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
          <input name="full_name" placeholder="Full name" required className="sm:col-span-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
          <input name="email" type="email" placeholder="Email" required className="sm:col-span-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
          <select name="role" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm">
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select name="department_id" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm">
            <option value="">No department</option>
            {(departments ?? []).map((d: Department) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <input
            name="password"
            type="text"
            placeholder="Temporary password (min 8 chars)"
            required
            className="sm:col-span-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
          />
          <Button type="submit" className="sm:col-span-2">Create user</Button>
        </form>
        <p className="mt-2 text-xs text-zinc-400">
          The user signs in with this email/password immediately; share it with them securely and ask them to change it.
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <h2 className="border-b border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-900">All users</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/70 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(users ?? []).map((u: Profile) => (
                <tr key={u.id} className="transition-colors hover:bg-blue-50/40">
                  <td className="px-5 py-3 font-medium text-zinc-900">{u.full_name}</td>
                  <td className="px-4 py-3 text-zinc-700">{u.email}</td>
                  <td className="px-4 py-3 capitalize text-zinc-700">{u.role.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-zinc-700">{u.department_id ? deptMap.get(u.department_id) ?? "—" : "—"}</td>
                  <td className="px-4 py-3">
                    {u.is_active ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">Deactivated</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active && u.id !== profile.id && (
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
      </section>
    </div>
  );
}
