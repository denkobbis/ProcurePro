import Link from "next/link";
import { getCurrentProfile, APPROVER_ROLES, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import StatCard from "@/components/StatCard";
import { ButtonLink } from "@/components/Button";
import { DocumentIcon, CheckCircleIcon, CartIcon, SparkleIcon } from "@/components/icons";
import { checkFxExposure } from "@/lib/fx-exposure";
import { getBottleneckFlags } from "@/lib/approval-bottleneck";
import { getExpiringCertifications } from "@/lib/reports";

interface ActionableApproval {
  id: string;
  request_id: string;
  step_order: number;
  approver_role: string;
  request_number: string;
  description: string;
  requester_id: string;
  qty: number;
  est_unit_cost: number;
  created_at: string;
}

interface SmartFlag {
  key: string;
  href: string;
  text: string;
}

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

  // Advisory "smart flags" — the same read-only, deterministic insights the AI
  // roadmap ships, surfaced where a sign-in lands first. Nothing here blocks
  // any action; each flag links to the page where the detail lives.
  const flags: SmartFlag[] = [];

  if (APPROVER_ROLES.includes(profile.role)) {
    const { data: approvals } = await supabase.from("v_actionable_approvals").select("*").order("created_at");
    const list = (approvals ?? []) as ActionableApproval[];
    const bottleneck = await getBottleneckFlags(supabase, list);
    for (const [id, f] of bottleneck) {
      if (!f.isSlow) continue;
      const a = list.find((x) => x.id === id);
      if (!a) continue;
      flags.push({
        key: `slow-approval-${id}`,
        href: "/approvals",
        text: `${a.request_number} has been waiting ${f.waitingDays} days for the ${a.approver_role.replace(/_/g, " ")} step${
          f.historicalAvgDays != null ? ` — usually decided in ${f.historicalAvgDays} days` : ""
        }.`,
      });
      if (flags.length >= 3) break;
    }
  }

  if (PROCUREMENT_ROLES.includes(profile.role)) {
    const [{ data: pos }, { data: vendors }] = await Promise.all([
      supabase.from("purchase_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("vendors").select("id, name, account_number"),
    ]);

    const fx = await checkFxExposure(pos ?? []);
    for (const f of fx.slice(0, 3)) {
      flags.push({
        key: `fx-${f.poId}`,
        href: `/purchase-orders/${f.poId}`,
        text: `${f.poNumber}: ${f.currency} is ${f.percentChange > 0 ? "up" : "down"} ${Math.abs(f.percentChange)}% vs. this PO's rate — landed cost is now roughly ${formatNaira(Math.abs(f.ngnImpact))} ${f.ngnImpact >= 0 ? "more" : "less"} in NGN.`,
      });
    }

    const certs = await getExpiringCertifications(supabase, 60);
    if (certs.length > 0) {
      flags.push({
        key: "expiring-certs",
        href: "/reports",
        text: `${certs.length} vendor certification${certs.length === 1 ? "" : "s"} expire${certs.length === 1 ? "s" : ""} within 60 days (earliest: ${certs[0].vendor_name}).`,
      });
    }

    const accountGroups = new Map<string, string[]>();
    for (const v of (vendors ?? []) as Array<{ id: string; name: string; account_number: string | null }>) {
      if (!v.account_number) continue;
      accountGroups.set(v.account_number, [...(accountGroups.get(v.account_number) ?? []), v.name]);
    }
    const shared = [...accountGroups.values()].filter((group) => group.length > 1);
    if (shared.length > 0) {
      flags.push({
        key: "shared-accounts",
        href: "/vendors",
        text: `${shared.length} bank account${shared.length === 1 ? "" : "s"} shared by multiple vendors — e.g. ${shared[0].join(" & ")}. Check this isn't a payment-diversion setup.`,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-brand-950 px-6 py-7 sm:px-8">
        <div className="bg-brand-glow pointer-events-none absolute inset-0" aria-hidden="true" />
        <h1 className="relative text-2xl font-semibold tracking-tight text-white">
          Welcome, {profile.full_name.split(" ")[0]}
        </h1>
        <p className="relative mt-1 text-sm text-brand-200">Here&apos;s what needs your attention today.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="My requests" value={myRequests ?? 0} href="/requests" icon={<DocumentIcon />} tint="brand" />
        {APPROVER_ROLES.includes(profile.role) && (
          <StatCard label="Pending my approval" value={pendingApprovals} href="/approvals" icon={<CheckCircleIcon />} tint="amber" />
        )}
        {PROCUREMENT_ROLES.includes(profile.role) && (
          <StatCard label="Open purchase orders" value={openPOs} href="/purchase-orders" icon={<CartIcon />} tint="green" />
        )}
      </div>

      {flags.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
            <SparkleIcon className="h-4 w-4 text-amber-600" />
            Smart flags
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm text-amber-800">
            {flags.map((flag) => (
              <li key={flag.key}>
                <Link href={flag.href} className="hover:underline">
                  {flag.text}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

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
