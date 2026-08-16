import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";
import MobileMenuButton from "./MobileMenuButton";
import TopbarSearch from "./TopbarSearch";
import { ButtonLink } from "./Button";
import { BellIcon } from "./icons";

export default async function Topbar({ profile }: { profile: Profile }) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("is_read", false);

  return (
    <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3.5 sm:px-7">
      <MobileMenuButton />
      <TopbarSearch />
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <a
          href="/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          aria-label="Notifications"
        >
          <BellIcon className="h-[18px] w-[18px]" />
          {!!count && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
              {count}
            </span>
          )}
        </a>
        <ButtonLink href="/requests/new" size="sm">
          New request
        </ButtonLink>
      </div>
    </header>
  );
}
