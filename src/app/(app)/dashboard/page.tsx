import { getCurrentProfile, APPROVER_ROLES, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { ButtonLink } from "@/components/Button";
import { DocumentIcon, CheckCircleIcon, CartIcon } from "@/components/icons";

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

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${profile.full_name.split(" ")[0]}`} description="Here's what needs your attention today." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="My requests" value={myRequests ?? 0} href="/requests" icon={<DocumentIcon />} tint="blue" />
        {APPROVER_ROLES.includes(profile.role) && (
          <StatCard label="Pending my approval" value={pendingApprovals} href="/approvals" icon={<CheckCircleIcon />} tint="amber" />
        )}
        {PROCUREMENT_ROLES.includes(profile.role) && (
          <StatCard label="Open purchase orders" value={openPOs} href="/purchase-orders" icon={<CartIcon />} tint="green" />
        )}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/requests/new">New purchase request</ButtonLink>
          <ButtonLink href="/budgets" variant="secondary">View budgets</ButtonLink>
        </div>
      </div>
    </div>
  );
}
