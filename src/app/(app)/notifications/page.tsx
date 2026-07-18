import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { markNotificationRead, markAllNotificationsRead } from "@/app/actions/notifications";
import PageHeader from "@/components/PageHeader";
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
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        actions={
          rows.some((n) => !n.is_read) ? (
            <form action={markAllNotificationsRead}>
              <button className="text-sm font-medium text-zinc-500 hover:text-blue-700">Mark all as read</button>
            </form>
          ) : undefined
        }
      />

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <EmptyState icon={<BellIcon />} title="No notifications yet" />
        ) : (
          <div className="divide-y divide-zinc-100">
            {rows.map((n: AppNotification) => (
              <div key={n.id} className={`flex items-center justify-between gap-4 p-4 transition-colors hover:bg-blue-50/40 ${n.is_read ? "" : "bg-blue-50/60"}`}>
                <a href={n.link ?? "#"} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!n.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />}
                    <div className="truncate text-sm font-medium text-zinc-900">{n.title}</div>
                  </div>
                  {n.body && <div className="mt-0.5 text-sm text-zinc-500">{n.body}</div>}
                  <div className="mt-1 text-xs text-zinc-400">{new Date(n.created_at).toLocaleString()}</div>
                </a>
                {!n.is_read && (
                  <form action={markNotificationRead}>
                    <input type="hidden" name="id" value={n.id} />
                    <button className="shrink-0 text-xs font-medium text-zinc-500 hover:text-blue-700">Mark read</button>
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
