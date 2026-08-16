import { getCurrentProfile, requireRole, ADMIN_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createDepartment, createUser } from "@/app/actions/users";
import { Button } from "@/components/Button";
import { CopyButton } from "@/components/CopyButton";
import UsersTable, { type UserRow } from "./UsersTable";
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

  const rigsourceUrl = process.env.RIGSOURCE_URL;
  const rigsourceInviteCode = process.env.RIGSOURCE_INVITE_CODE;
  const rigsourceEnabled = Boolean(rigsourceUrl && rigsourceInviteCode);
  const rigsourceInviteLink = rigsourceEnabled ? `${rigsourceUrl}/register?invite=${rigsourceInviteCode}` : null;

  const tableRows: UserRow[] = ((users ?? []) as Profile[]).map((u) => ({
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    role: u.role,
    departmentName: u.department_id ? deptMap.get(u.department_id) ?? "—" : "—",
    isActive: u.is_active,
    isSelf: u.id === profile.id,
    rigsourceInvitedAt: u.rigsource_invited_at,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[38px] font-semibold leading-none tracking-tight text-zinc-900 dark:text-zinc-100">Users &amp; departments</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{tableRows.length} teammates across {departments?.length ?? 0} departments.</p>
      </div>

      <UsersTable rows={tableRows} rigsourceEnabled={rigsourceEnabled} />

      {rigsourceEnabled && (
        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">RigSource access</h2>
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            Share this link with a user to have them join your team&apos;s RigSource sourcing workspace.
            The &quot;Grant access&quot; button in the table above just marks who&apos;s been sent it.
          </p>
          <div className="flex max-w-xl items-center gap-2">
            <code className="flex-1 truncate rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {rigsourceInviteLink}
            </code>
            <CopyButton value={rigsourceInviteLink!} />
          </div>
        </section>
      )}

      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Departments</h2>
        <ul className="mb-4 flex flex-wrap gap-2">
          {(departments ?? []).map((d: Department) => (
            <li key={d.id} className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {d.name}
            </li>
          ))}
        </ul>
        <form action={createDepartment} className="flex gap-2">
          <input name="name" placeholder="New department name" required className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
          <Button type="submit" size="sm">Add</Button>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Invite a user</h2>
        <form action={createUser} className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
          <input name="full_name" placeholder="Full name" required className="sm:col-span-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
          <input name="email" type="email" placeholder="Email" required className="sm:col-span-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
          <select name="role" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select name="department_id" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
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
            className="sm:col-span-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <Button type="submit" className="sm:col-span-2">Create user</Button>
        </form>
        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
          The user signs in with this email/password immediately; share it with them securely and ask them to change it.
        </p>
      </section>
    </div>
  );
}
