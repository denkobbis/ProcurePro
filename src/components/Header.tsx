import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";
import MobileMenuButton from "./MobileMenuButton";
import { BellIcon } from "./icons";

const ROLE_LABELS: Record<string, string> = {
  requester: "Requester",
  approver: "Approver",
  procurement_officer: "Procurement Officer",
  finance_admin: "Finance / Admin",
  super_admin: "Super Admin",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

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
      <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1">
        <a href="/notifications" className="relative flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900" aria-label="Notifications">
          <BellIcon className="h-5 w-5" />
          {!!count && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
              {count}
            </span>
          )}
        </a>
        <div className="flex items-center gap-2.5 border-l border-zinc-200 pl-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
            {initials(profile.full_name)}
          </div>
          <div className="text-sm leading-tight">
            <div className="font-medium text-zinc-900">{profile.full_name}</div>
            <div className="text-xs text-zinc-500">{ROLE_LABELS[profile.role] ?? profile.role}</div>
          </div>
          <form action={signOut}>
            <button type="submit" className="ml-1 rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
