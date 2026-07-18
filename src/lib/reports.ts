import type { SupabaseClient } from "@supabase/supabase-js";

export interface SpendRow {
  label: string;
  amount: number;
}

interface PoWithRequest {
  total_amount_ngn: number;
  freight_cost_ngn: number;
  customs_duty_ngn: number;
  department_id: string;
  vendor_id: string;
  created_at: string;
  requests: { category: string } | { category: string }[] | null;
}

function landedCost(po: PoWithRequest): number {
  return po.total_amount_ngn + po.freight_cost_ngn + po.customs_duty_ngn;
}

async function fetchPosWithContext(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("purchase_orders")
    .select("total_amount_ngn, freight_cost_ngn, customs_duty_ngn, department_id, vendor_id, created_at, requests(category)");
  return (data ?? []) as PoWithRequest[];
}

function categoryOf(po: PoWithRequest): string {
  const req = Array.isArray(po.requests) ? po.requests[0] : po.requests;
  return req?.category ?? "Uncategorized";
}

function groupSum(rows: { key: string; amount: number }[]): SpendRow[] {
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.key, (totals.get(r.key) ?? 0) + r.amount);
  return [...totals.entries()].map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount);
}

export async function getSpendByDepartment(supabase: SupabaseClient): Promise<SpendRow[]> {
  const [pos, { data: departments }] = await Promise.all([
    fetchPosWithContext(supabase),
    supabase.from("departments").select("id, name"),
  ]);
  const nameMap = new Map((departments ?? []).map((d) => [d.id, d.name]));
  return groupSum(pos.map((po) => ({ key: nameMap.get(po.department_id) ?? "Unknown", amount: landedCost(po) })));
}

export async function getSpendByCategory(supabase: SupabaseClient): Promise<SpendRow[]> {
  const pos = await fetchPosWithContext(supabase);
  return groupSum(pos.map((po) => ({ key: categoryOf(po), amount: landedCost(po) })));
}

export async function getSpendByVendor(supabase: SupabaseClient): Promise<SpendRow[]> {
  const [pos, { data: vendors }] = await Promise.all([
    fetchPosWithContext(supabase),
    supabase.from("vendors").select("id, name"),
  ]);
  const nameMap = new Map((vendors ?? []).map((v) => [v.id, v.name]));
  return groupSum(pos.map((po) => ({ key: nameMap.get(po.vendor_id) ?? "Unknown", amount: landedCost(po) })));
}

export async function getSpendTrend(supabase: SupabaseClient, months = 6): Promise<SpendRow[]> {
  const pos = await fetchPosWithContext(supabase);
  const buckets: SpendRow[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("en-US", { month: "short", year: "numeric" });
    const amount = pos
      .filter((po) => {
        const created = new Date(po.created_at);
        return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth();
      })
      .reduce((sum, po) => sum + landedCost(po), 0);
    buckets.push({ label, amount });
  }
  return buckets;
}

export interface PendingApprovalOverviewRow {
  request_number: string;
  description: string;
  approver_role: string;
  step_order: number;
  amount: number;
}

// Unlike v_actionable_approvals (used in the Approvals inbox), this surfaces
// every pending step regardless of whether it's the current one — a
// company-wide "what's stuck, and where" view for admins.
export async function getPendingApprovalsOverview(supabase: SupabaseClient): Promise<PendingApprovalOverviewRow[]> {
  const { data } = await supabase
    .from("approvals")
    .select("step_order, approver_role, requests(request_number, description, qty, est_unit_cost)")
    .eq("status", "pending");

  return ((data ?? []) as unknown as {
    step_order: number;
    approver_role: string;
    requests: { request_number: string; description: string; qty: number; est_unit_cost: number } | { request_number: string; description: string; qty: number; est_unit_cost: number }[] | null;
  }[])
    .map((row) => {
      const req = Array.isArray(row.requests) ? row.requests[0] : row.requests;
      return {
        request_number: req?.request_number ?? "—",
        description: req?.description ?? "—",
        approver_role: row.approver_role,
        step_order: row.step_order,
        amount: (req?.qty ?? 0) * (req?.est_unit_cost ?? 0),
      };
    });
}

export interface ExpiringCertRow {
  vendor_id: string;
  vendor_name: string;
  label: string;
  expiry_date: string;
  daysUntilExpiry: number;
}

// Surfaces NCDMB certs plus any vendor document with an expiry_date, within
// the given window — a "what needs renewing soon" list for admins.
export async function getExpiringCertifications(supabase: SupabaseClient, daysAhead = 60): Promise<ExpiringCertRow[]> {
  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, name, ncdmb_certificate_expiry, documents");

  const now = Date.now();
  const cutoff = now + daysAhead * 24 * 60 * 60 * 1000;
  const rows: ExpiringCertRow[] = [];

  for (const v of vendors ?? []) {
    if (v.ncdmb_certificate_expiry) {
      const t = new Date(v.ncdmb_certificate_expiry).getTime();
      if (t <= cutoff) {
        rows.push({
          vendor_id: v.id,
          vendor_name: v.name,
          label: "NCDMB Certificate",
          expiry_date: v.ncdmb_certificate_expiry,
          daysUntilExpiry: Math.ceil((t - now) / (24 * 60 * 60 * 1000)),
        });
      }
    }
    for (const doc of (v.documents ?? []) as { document_type?: string; file_name: string; expiry_date?: string | null }[]) {
      if (!doc.expiry_date) continue;
      const t = new Date(doc.expiry_date).getTime();
      if (t <= cutoff) {
        rows.push({
          vendor_id: v.id,
          vendor_name: v.name,
          label: doc.document_type || doc.file_name,
          expiry_date: doc.expiry_date,
          daysUntilExpiry: Math.ceil((t - now) / (24 * 60 * 60 * 1000)),
        });
      }
    }
  }

  return rows.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

export function toCsv(rows: SpendRow[]): string {
  const header = "Label,Amount\n";
  const body = rows.map((r) => `"${r.label.replace(/"/g, '""')}",${r.amount}`).join("\n");
  return header + body;
}
