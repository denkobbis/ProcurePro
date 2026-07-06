import { getCurrentProfile, requireRole, ADMIN_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createDepartment, createUser, deactivateUser } from "@/app/actions/users";
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
      <h1 className="text-xl font-semibold text-zinc-900">Users &amp; Departments</h1>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 font-medium text-zinc-900">Departments</h2>
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
          <button className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800">
            Add
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 font-medium text-zinc-900">Invite a user</h2>
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
          <button className="sm:col-span-2 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800">
            Create user
          </button>
        </form>
        <p className="mt-2 text-xs text-zinc-400">
          The user signs in with this email/password immediately; share it with them securely and ask them to change it.
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 font-medium text-zinc-900">All users</h2>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500">
              <th className="py-2">Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u: Profile) => (
              <tr key={u.id} className="border-b border-zinc-100">
                <td className="py-2">{u.full_name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.department_id ? deptMap.get(u.department_id) ?? "—" : "—"}</td>
                <td>{u.is_active ? "Active" : "Deactivated"}</td>
                <td>
                  {u.is_active && u.id !== profile.id && (
                    <form action={deactivateUser}>
                      <input type="hidden" name="user_id" value={u.id} />
                      <button className="text-xs text-red-600 hover:underline">Deactivate</button>
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
