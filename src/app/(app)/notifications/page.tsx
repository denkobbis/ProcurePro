import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { markNotificationRead, markAllNotificationsRead } from "@/app/actions/notifications";
import EmptyState from "@/components/EmptyState";
import { BellIcon } from "@/components/icons";
import type { AppNotification } from "@/lib/database.types";

export default async function NotificationsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = notifications ?? [];

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[38px] font-semibold leading-none tracking-tight text-zinc-900 dark:text-zinc-100">Notifications</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">The last 50 things that happened on your requests and orders.</p>
        </div>
        {rows.some((n) => !n.is_read) && (
          <form action={markAllNotificationsRead}>
            <button className="text-sm font-medium text-zinc-500 hover:text-brand-700 dark:text-zinc-400 dark:hover:text-brand-400">Mark all as read</button>
          </form>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {rows.length === 0 ? (
          <EmptyState icon={<BellIcon />} title="No notifications yet" />
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((n: AppNotification) => (
              <div key={n.id} className={`flex items-center justify-between gap-4 p-4 transition-colors hover:bg-brand-50/40 dark:hover:bg-brand-500/10 ${n.is_read ? "" : "bg-brand-50/60 dark:bg-brand-500/10"}`}>
                <a href={n.link ?? "#"} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!n.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />}
                    <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{n.title}</div>
                  </div>
                  {n.body && <div className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{n.body}</div>}
                  <div className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{new Date(n.created_at).toLocaleString()}</div>
                </a>
                {!n.is_read && (
                  <form action={markNotificationRead}>
                    <input type="hidden" name="id" value={n.id} />
                    <button className="shrink-0 text-xs font-medium text-zinc-500 hover:text-brand-700 dark:text-zinc-400 dark:hover:text-brand-400">Mark read</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
