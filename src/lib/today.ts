import type { SupabaseClient } from "@supabase/supabase-js";
import { formatNaira, formatMoney } from "@/lib/money";
import { getBottleneckFlags } from "@/lib/approval-bottleneck";
import { checkFxExposure } from "@/lib/fx-exposure";
import { checkBudget } from "@/lib/budget";
import { APPROVER_ROLES, PROCUREMENT_ROLES } from "@/lib/auth";
import type { Profile, PurchaseOrder, Department, Budget } from "@/lib/database.types";

function compactNaira(n: number): string {
  return "₦" + new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export interface LoopStep {
  step: string;
  count: number;
  valueLabel: string;
  label: string;
  sub: string;
  subTone: "warn" | "neutral";
  href: string;
}

export interface NeedsYouRow {
  key: string;
  href: string;
  ref: string;
  title: string;
  tag: string;
  evidence: string;
  amountLabel: string;
  severity: "urgent" | "neutral";
  cost: number;
  approvalId?: string;
}

export interface DeptBudgetBar {
  name: string;
  committed: number;
  cap: number;
  over: boolean;
}

export interface MovedRow {
  ref: string;
  text: string;
  when: string;
}

export interface TodayData {
  decisionsCount: number;
  loop: LoopStep[];
  needsYou: NeedsYouRow[];
  approvalsWaitingCount: number;
  budgetBars: DeptBudgetBar[];
  moved: MovedRow[];
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: false });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

export async function getTodayData(supabase: SupabaseClient, profile: Profile): Promise<TodayData> {
  const isApprover = APPROVER_ROLES.includes(profile.role);
  const isProcurement = PROCUREMENT_ROLES.includes(profile.role);

  const [{ data: draftSubmitted }, { data: underReview }, { data: poRows }, { data: vendors }] = await Promise.all([
    supabase.from("requests").select("qty, est_unit_cost, status"),
    supabase.from("requests").select("qty, est_unit_cost").eq("status", "under_review"),
    supabase.from("purchase_orders").select("*"),
    supabase.from("vendors").select("id, name, account_number"),
  ]);

  const allRequests = (draftSubmitted ?? []) as Array<{ qty: number; est_unit_cost: number; status: string }>;
  const draftRows = allRequests.filter((r) => r.status === "draft" || r.status === "submitted");
  const draftCount = draftRows.length;
  const draftValue = draftRows.reduce((s, r) => s + r.qty * r.est_unit_cost, 0);
  const sittingUnsent = draftRows.filter((r) => r.status === "draft").length;

  const reviewRows = (underReview ?? []) as Array<{ qty: number; est_unit_cost: number }>;
  const reviewCount = reviewRows.length;
  const reviewValue = reviewRows.reduce((s, r) => s + r.qty * r.est_unit_cost, 0);

  const allPos = (poRows ?? []) as PurchaseOrder[];
  const openPos = allPos.filter((po) => !["fully_received", "closed"].includes(po.status));
  const openPoValue = openPos.reduce((s, po) => s + po.total_amount_ngn, 0);
  const receivingPos = allPos.filter((po) => ["in_transit", "customs_clearance", "partially_received"].includes(po.status));
  const receivingValue = receivingPos.reduce((s, po) => s + po.total_amount_ngn, 0);
  const overdueCount = receivingPos.filter((po) => po.eta && new Date(po.eta) < new Date()).length;

  const fxFlags = await checkFxExposure(allPos);
  const fxCount = fxFlags.filter((f) => openPos.some((po) => po.id === f.poId)).length;

  const loop: LoopStep[] = [
    {
      step: "01",
      count: draftCount,
      valueLabel: compactNaira(draftValue),
      label: "Drafted & submitted",
      sub: sittingUnsent > 0 ? `${sittingUnsent} sitting unsent` : "All submitted",
      subTone: "neutral",
      href: "/requests",
    },
    {
      step: "02",
      count: reviewCount,
      valueLabel: compactNaira(reviewValue),
      label: "Awaiting approval",
      sub: "computed-below",
      subTone: "neutral",
      href: "/approvals",
    },
    {
      step: "03",
      count: openPos.length,
      valueLabel: compactNaira(openPoValue),
      label: "Open purchase orders",
      sub: fxCount > 0 ? `${fxCount} FX exposed` : "No FX exposure",
      subTone: fxCount > 0 ? "warn" : "neutral",
      href: "/purchase-orders",
    },
    {
      step: "04",
      count: receivingPos.length,
      valueLabel: compactNaira(receivingValue),
      label: "Awaiting receipt",
      sub: overdueCount > 0 ? `${overdueCount} overdue` : "On schedule",
      subTone: overdueCount > 0 ? "warn" : "neutral",
      href: "/purchase-orders",
    },
  ];

  const needsYou: NeedsYouRow[] = [];
  let approvalsWaitingCount = 0;

  if (isApprover) {
    const { data: approvals } = await supabase.from("v_actionable_approvals").select("*").order("created_at");
    const list = (approvals ??
      []) as Array<{ id: string; request_id: string; step_order: number; approver_role: string; request_number: string; description: string; qty: number; est_unit_cost: number; created_at: string }>;
    approvalsWaitingCount = list.length;
    const flags = await getBottleneckFlags(supabase, list);

    for (const a of list) {
      const flag = flags.get(a.id);
      const waitingDays = flag?.waitingDays ?? 0;
      const amount = a.qty * a.est_unit_cost;
      needsYou.push({
        key: `approval-${a.id}`,
        href: `/requests/${a.request_id}`,
        ref: a.request_number,
        title: a.description,
        tag: `${Math.round(waitingDays)} DAY${Math.round(waitingDays) === 1 ? "" : "S"} WAITING`,
        evidence:
          flag?.historicalAvgDays != null
            ? `Your ${a.approver_role.replace(/_/g, " ")} step — usually decided in ${flag.historicalAvgDays} days.`
            : `Your ${a.approver_role.replace(/_/g, " ")} step.`,
        amountLabel: formatNaira(amount),
        severity: flag?.isSlow ? "urgent" : "neutral",
        cost: amount * Math.max(waitingDays, 1),
        approvalId: a.id,
      });
    }
  }

  if (isProcurement) {
    const vendorIds = [...new Set(openPos.map((po) => po.vendor_id))];
    const { data: vendorRows } = vendorIds.length ? await supabase.from("vendors").select("id, name").in("id", vendorIds) : { data: [] };
    const vendorNameMap = new Map((vendorRows ?? []).map((v: { id: string; name: string }) => [v.id, v.name]));

    for (const f of fxFlags) {
      const po = allPos.find((p) => p.id === f.poId);
      if (!po || !openPos.some((p) => p.id === f.poId)) continue;
      needsYou.push({
        key: `fx-${f.poId}`,
        href: `/purchase-orders/${f.poId}`,
        ref: f.poNumber,
        title: vendorNameMap.get(po.vendor_id) ?? "Vendor",
        tag: "FX MOVED",
        evidence: `${f.currency} ${f.percentChange > 0 ? "up" : "down"} ${Math.abs(f.percentChange)}% since pricing — settling now lands ${formatNaira(Math.abs(f.ngnImpact))} ${f.ngnImpact >= 0 ? "over" : "under"} budget.`,
        amountLabel: formatMoney(po.total_amount, po.currency),
        severity: "urgent",
        cost: Math.abs(f.ngnImpact),
      });
    }

    const accountGroups = new Map<string, string[]>();
    for (const v of (vendors ?? []) as Array<{ id: string; name: string; account_number: string | null }>) {
      if (!v.account_number) continue;
      accountGroups.set(v.account_number, [...(accountGroups.get(v.account_number) ?? []), v.name]);
    }
    const shared = [...accountGroups.values()].filter((group) => group.length > 1);
    if (shared.length > 0) {
      const names = shared[0];
      needsYou.push({
        key: "shared-account",
        href: "/vendors",
        ref: "Vendors",
        title: names.join(" & "),
        tag: "SAME ACCOUNT",
        evidence: `${shared.length} bank account${shared.length === 1 ? "" : "s"} shared by multiple vendors. Worth confirming before the next payout.`,
        amountLabel: "—",
        severity: "urgent",
        cost: 1,
      });
    }
  }

  needsYou.sort((a, b) => b.cost - a.cost);

  loop[1].sub = (() => {
    const slowCount = needsYou.filter((r) => r.key.startsWith("approval-") && r.severity === "urgent").length;
    return slowCount > 0 ? `${slowCount} slower than usual` : "On pace";
  })();
  loop[1].subTone = loop[1].sub === "On pace" ? "neutral" : "warn";

  // Budget bars: aggregate every department's current-period budgets into one bar.
  const [{ data: departments }, { data: budgets }] = await Promise.all([
    supabase.from("departments").select("*"),
    supabase.from("budgets").select("*"),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const currentBudgets = ((budgets ?? []) as Budget[]).filter((b) => b.period_start <= today && b.period_end >= today);
  const budgetBars: DeptBudgetBar[] = [];
  for (const dept of (departments ?? []) as Department[]) {
    const deptBudgets = currentBudgets.filter((b) => b.department_id === dept.id);
    if (deptBudgets.length === 0) continue;
    let committed = 0;
    let cap = 0;
    for (const b of deptBudgets) {
      const usage = await checkBudget(supabase, dept.id, b.category, 0);
      committed += usage.committed + usage.spent;
      cap += b.allocated_amount;
    }
    budgetBars.push({ name: dept.name, committed, cap, over: committed > cap });
  }
  budgetBars.sort((a, b) => b.committed / Math.max(b.cap, 1) - a.committed / Math.max(a.cap, 1));

  // Moved today: requests and POs updated in the last 24h, newest first.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ data: recentRequests }, { data: recentPos }] = await Promise.all([
    supabase.from("requests").select("request_number, status, requester_id, updated_at").gte("updated_at", since).order("updated_at", { ascending: false }).limit(4),
    supabase.from("purchase_orders").select("po_number, status, vendor_id, updated_at").gte("updated_at", since).order("updated_at", { ascending: false }).limit(4),
  ]);

  const requesterIds = [...new Set((recentRequests ?? []).map((r: { requester_id: string }) => r.requester_id))];
  const vendorIds2 = [...new Set((recentPos ?? []).map((p: { vendor_id: string }) => p.vendor_id))];
  const [{ data: requesters }, { data: movedVendors }] = await Promise.all([
    requesterIds.length ? supabase.from("profiles").select("id, full_name").in("id", requesterIds) : Promise.resolve({ data: [] }),
    vendorIds2.length ? supabase.from("vendors").select("id, name").in("id", vendorIds2) : Promise.resolve({ data: [] }),
  ]);
  const requesterNameMap = new Map((requesters ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name.split(" ")[0]]));
  const movedVendorMap = new Map((movedVendors ?? []).map((v: { id: string; name: string }) => [v.id, v.name]));

  const REQUEST_STATUS_TEXT: Record<string, (r: { requester_id: string }) => string> = {
    draft: () => "saved as draft",
    submitted: (r) => `submitted by ${requesterNameMap.get(r.requester_id) ?? "a teammate"}`,
    under_review: () => "moved to review",
    approved: () => "approved, ready for PO",
    rejected: () => "rejected",
    converted_to_po: () => "converted to a purchase order",
  };
  const PO_STATUS_TEXT: Record<string, (p: { vendor_id: string }) => string> = {
    draft: () => "drafted",
    sent_to_vendor: (p) => `sent to ${movedVendorMap.get(p.vendor_id) ?? "vendor"}`,
    in_transit: () => "in transit",
    customs_clearance: () => "in customs clearance",
    partially_received: () => "partially received",
    fully_received: () => "fully received",
    closed: () => "fully received, closed",
  };

  const moved: MovedRow[] = [
    ...(recentRequests ?? []).map((r: { request_number: string; status: string; requester_id: string; updated_at: string }) => ({
      ref: r.request_number,
      text: (REQUEST_STATUS_TEXT[r.status] ?? (() => r.status.replace(/_/g, " ")))(r),
      when: timeLabel(r.updated_at),
      ts: r.updated_at,
    })),
    ...(recentPos ?? []).map((p: { po_number: string; status: string; vendor_id: string; updated_at: string }) => ({
      ref: p.po_number,
      text: (PO_STATUS_TEXT[p.status] ?? (() => p.status.replace(/_/g, " ")))(p),
      when: timeLabel(p.updated_at),
      ts: p.updated_at,
    })),
  ]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 4)
    .map(({ ref, text, when }) => ({ ref, text, when }));

  return {
    decisionsCount: needsYou.length,
    loop,
    needsYou: needsYou.slice(0, 5),
    approvalsWaitingCount,
    budgetBars: budgetBars.slice(0, 4),
    moved,
  };
}
