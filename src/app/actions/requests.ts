"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { checkBudget } from "@/lib/budget";
import { notifyApproversForStep } from "@/lib/notify";
import type { SupabaseClient } from "@supabase/supabase-js";

// Runs the RPC that routes the request through its approval chain, after a
// budget check. Hard-blocked overspend stops submission entirely; otherwise
// the request still submits and the caller redirects with a warning banner.
async function submitWithBudgetCheck(
  supabase: SupabaseClient,
  requestId: string,
  departmentId: string,
  category: string,
  amount: number
): Promise<{ warning: boolean }> {
  const budget = await checkBudget(supabase, departmentId, category, amount, requestId);
  if (budget.wouldExceed && budget.hardBlock) {
    throw new Error(
      `This request exceeds the remaining budget for "${category}" and is blocked by your Finance/Admin team.`
    );
  }

  const { error } = await supabase.rpc("submit_request", { p_request_id: requestId });
  if (error) throw new Error(error.message);

  await notifyApproversForStep(supabase, requestId, 1);

  return { warning: budget.wouldExceed };
}

export async function createRequest(formData: FormData) {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const qty = Number(formData.get("qty") ?? 0);
  const estUnitCost = Number(formData.get("est_unit_cost") ?? 0);
  const vendorId = String(formData.get("vendor_id") ?? "") || null;
  const justification = String(formData.get("justification") ?? "").trim() || null;
  const urgency = String(formData.get("urgency") ?? "normal");
  const mpn = String(formData.get("mpn") ?? "").trim() || null;
  const oemBrand = String(formData.get("oem_brand") ?? "").trim() || null;
  const submitNow = formData.get("submit_now") === "on";

  if (!description || !category || qty <= 0 || estUnitCost < 0) {
    throw new Error("Please fill in description, category, quantity, and estimated unit cost");
  }
  if (!profile.department_id) {
    throw new Error("Your account has no department assigned. Ask an admin to fix this before submitting requests.");
  }

  const { data: request, error } = await supabase
    .from("requests")
    .insert({
      request_number: (await supabase.rpc("next_request_number")).data,
      requester_id: profile.id,
      department_id: profile.department_id,
      category,
      description,
      qty,
      est_unit_cost: estUnitCost,
      vendor_id: vendorId,
      justification,
      urgency,
      mpn,
      oem_brand: oemBrand,
      status: "draft",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const attachment = formData.get("attachment") as File | null;
  if (attachment && attachment.size > 0) {
    await uploadAttachmentFile(request.id, attachment, profile.id);
  }

  let warning = false;
  if (submitNow) {
    const result = await submitWithBudgetCheck(supabase, request.id, profile.department_id, category, qty * estUnitCost);
    warning = result.warning;
  }

  revalidatePath("/requests");
  redirect(`/requests/${request.id}${warning ? "?warning=over_budget" : ""}`);
}

async function uploadAttachmentFile(requestId: string, file: File, uploadedBy: string) {
  const supabase = await createClient();
  const path = `requests/${requestId}/${Date.now()}-${file.name}`;
  const { error: uploadErr } = await supabase.storage.from("attachments").upload(path, file);
  if (uploadErr) throw new Error(uploadErr.message);

  const { error: insertErr } = await supabase.from("request_attachments").insert({
    request_id: requestId,
    file_path: path,
    file_name: file.name,
    uploaded_by: uploadedBy,
  });
  if (insertErr) throw new Error(insertErr.message);
}

export async function submitRequest(formData: FormData) {
  const requestId = String(formData.get("request_id") ?? "");
  const supabase = await createClient();

  const { data: request, error: fetchErr } = await supabase
    .from("requests")
    .select("department_id, category, qty, est_unit_cost")
    .eq("id", requestId)
    .single();
  if (fetchErr || !request) throw new Error(fetchErr?.message ?? "Request not found");

  const { warning } = await submitWithBudgetCheck(
    supabase,
    requestId,
    request.department_id,
    request.category,
    request.qty * request.est_unit_cost
  );

  revalidatePath(`/requests/${requestId}`);
  if (warning) redirect(`/requests/${requestId}?warning=over_budget`);
}

export async function addRequestComment(formData: FormData) {
  const profile = await getCurrentProfile();
  const requestId = String(formData.get("request_id") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();
  if (!comment) return;

  const supabase = await createClient();
  const { error } = await supabase.from("request_comments").insert({
    request_id: requestId,
    author_id: profile.id,
    comment,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/requests/${requestId}`);
}

export async function addRequestAttachment(formData: FormData) {
  const profile = await getCurrentProfile();
  const requestId = String(formData.get("request_id") ?? "");
  const file = formData.get("attachment") as File | null;
  if (!file || file.size === 0) return;

  await uploadAttachmentFile(requestId, file, profile.id);
  revalidatePath(`/requests/${requestId}`);
}
