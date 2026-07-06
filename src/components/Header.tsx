import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";
import MobileMenuButton from "./MobileMenuButton";

const ROLE_LABELS: Record<string, string> = {
  requester: "Requester",
  approver: "Approver",
  procurement_officer: "Procurement Officer",
  finance_admin: "Finance / Admin",
  super_admin: "Super Admin",
};

export default async function Header({ profile }: { profile: Profile }) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("is_read", false);

  return (
    <header className="flex min-h-14 flex-wrap items-center justify-between gap-y-2 border-b border-zinc-200 bg-white px-3 py-2 sm:px-6">
      <MobileMenuButton />
      <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-4">
        <a href="/notifications" className="relative text-sm text-zinc-600 hover:text-zinc-900">
          Notifications
          {!!count && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-medium text-white">
              {count}
            </span>
          )}
        </a>
        <div className="text-sm">
          <span className="font-medium text-zinc-900">{profile.full_name}</span>
          <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
            {ROLE_LABELS[profile.role] ?? profile.role}
          </span>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-sm text-zinc-500 hover:text-zinc-900">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
