import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { markNotificationRead, markAllNotificationsRead } from "@/app/actions/notifications";
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Notifications</h1>
        <form action={markAllNotificationsRead}>
          <button className="text-sm text-zinc-500 hover:text-zinc-900">Mark all as read</button>
        </form>
      </div>

      <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
        {(notifications ?? []).length === 0 && (
          <p className="p-5 text-sm text-zinc-500">No notifications yet.</p>
        )}
        {(notifications ?? []).map((n: AppNotification) => (
          <div key={n.id} className={`flex items-center justify-between p-4 ${n.is_read ? "" : "bg-zinc-50"}`}>
            <a href={n.link ?? "#"} className="flex-1">
              <div className="text-sm font-medium text-zinc-900">{n.title}</div>
              {n.body && <div className="text-sm text-zinc-500">{n.body}</div>}
              <div className="mt-1 text-xs text-zinc-400">{new Date(n.created_at).toLocaleString()}</div>
            </a>
            {!n.is_read && (
              <form action={markNotificationRead}>
                <input type="hidden" name="id" value={n.id} />
                <button className="text-xs text-zinc-500 hover:text-zinc-900">Mark read</button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
