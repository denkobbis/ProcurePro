import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "./email";
import { formatNaira } from "./money";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function wrap(title: string, body: string, link?: string) {
  return `<div style="font-family:sans-serif;font-size:14px;color:#18181b">
    <h2 style="margin:0 0 12px">${title}</h2>
    <p style="margin:0 0 16px">${body}</p>
    ${link ? `<a href="${link}" style="color:#2563eb">View in ProcurePro</a>` : ""}
  </div>`;
}

async function getRequesterAndRequest(supabase: SupabaseClient, requestId: string) {
  const { data: request } = await supabase
    .from("requests")
    .select("requester_id, request_number, description, qty, est_unit_cost")
    .eq("id", requestId)
    .single();
  if (!request) return null;

  const { data: requester } = await supabase.from("profiles").select("email, full_name").eq("id", request.requester_id).single();
  if (!requester) return null;

  return { request, requester };
}

export async function notifyApproversForStep(supabase: SupabaseClient, requestId: string, stepOrder: number) {
  const { data: approval } = await supabase
    .from("approvals")
    .select("approver_role")
    .eq("request_id", requestId)
    .eq("step_order", stepOrder)
    .maybeSingle();
  if (!approval) return;

  const { data: request } = await supabase
    .from("requests")
    .select("request_number, description, qty, est_unit_cost")
    .eq("id", requestId)
    .single();
  if (!request) return;

  const { data: approvers } = await supabase.from("profiles").select("email").eq("role", approval.approver_role).eq("is_active", true);
  const emails = (approvers ?? []).map((a) => a.email);

  await sendEmail(
    emails,
    `Approval needed: ${request.request_number}`,
    wrap(
      "A purchase request needs your approval",
      `${request.description} — total ${formatNaira(request.qty * request.est_unit_cost)}`,
      `${APP_URL}/approvals`
    )
  );
}

export async function notifyRequesterOfDecision(
  supabase: SupabaseClient,
  requestId: string,
  decision: "approved" | "rejected" | "info_requested"
) {
  const ctx = await getRequesterAndRequest(supabase, requestId);
  if (!ctx) return;

  const copy = {
    approved: { subject: "Your purchase request was approved", body: "Good news — it's been approved and is ready to convert into a purchase order." },
    rejected: { subject: "Your purchase request was rejected", body: "Check the request's comments for details." },
    info_requested: { subject: "More info needed on your purchase request", body: "An approver asked for more information before deciding." },
  }[decision];

  await sendEmail(
    [ctx.requester.email],
    `${copy.subject}: ${ctx.request.request_number}`,
    wrap(copy.subject, `${ctx.request.description} — ${copy.body}`, `${APP_URL}/requests/${requestId}`)
  );
}

export async function notifyPoSent(supabase: SupabaseClient, poId: string) {
  const { data: po } = await supabase.from("purchase_orders").select("po_number, request_id").eq("id", poId).single();
  if (!po?.request_id) return;

  const ctx = await getRequesterAndRequest(supabase, po.request_id);
  if (!ctx) return;

  await sendEmail(
    [ctx.requester.email],
    `Purchase order sent to vendor: ${po.po_number}`,
    wrap("Your purchase order has been sent to the vendor", `${po.po_number} — ${ctx.request.description}`, `${APP_URL}/purchase-orders/${poId}`)
  );
}

export async function notifyItemsReceived(supabase: SupabaseClient, poId: string, lineDescription: string, receivedQty: number) {
  const { data: po } = await supabase.from("purchase_orders").select("po_number, request_id, status").eq("id", poId).single();
  if (!po?.request_id) return;

  const ctx = await getRequesterAndRequest(supabase, po.request_id);
  if (!ctx) return;

  await sendEmail(
    [ctx.requester.email],
    `Items received for ${po.po_number}`,
    wrap(
      "Items have been received against your purchase order",
      `${receivedQty} received for "${lineDescription}" (${po.po_number}). Status: ${po.status.replace(/_/g, " ")}.`,
      `${APP_URL}/purchase-orders/${poId}`
    )
  );
}
