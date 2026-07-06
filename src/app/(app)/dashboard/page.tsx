import Link from "next/link";
import { getCurrentProfile, APPROVER_ROLES, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { count: myRequests } = await supabase
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("requester_id", profile.id);

  let pendingApprovals = 0;
  if (APPROVER_ROLES.includes(profile.role)) {
    const { count } = await supabase
      .from("approvals")
      .select("id", { count: "exact", head: true })
      .eq("approver_role", profile.role)
      .eq("status", "pending");
    pendingApprovals = count ?? 0;
  }

  let openPOs = 0;
  if (PROCUREMENT_ROLES.includes(profile.role)) {
    const { count } = await supabase
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["draft", "sent_to_vendor", "partially_received"]);
    openPOs = count ?? 0;
  }

  const cards = [
    { label: "My requests", value: myRequests ?? 0, href: "/requests" },
    ...(APPROVER_ROLES.includes(profile.role)
      ? [{ label: "Pending my approval", value: pendingApprovals, href: "/approvals" }]
      : []),
    ...(PROCUREMENT_ROLES.includes(profile.role)
      ? [{ label: "Open purchase orders", value: openPOs, href: "/purchase-orders" }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Welcome, {profile.full_name.split(" ")[0]}</h1>
        <p className="text-sm text-zinc-500">Here&apos;s what needs your attention today.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-lg border border-zinc-200 bg-white p-5 hover:border-zinc-300"
          >
            <div className="text-3xl font-semibold text-zinc-900">{c.value}</div>
            <div className="mt-1 text-sm text-zinc-500">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-2 font-medium text-zinc-900">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/requests/new" className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800">
            New purchase request
          </Link>
          <Link href="/budgets" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
            View budgets
          </Link>
        </div>
      </div>
    </div>
  );
}
