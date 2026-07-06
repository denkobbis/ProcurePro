"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { notifyApproversForStep, notifyRequesterOfDecision } from "@/lib/notify";

export async function actOnApproval(formData: FormData) {
  const approvalId = String(formData.get("approval_id") ?? "");
  const action = String(formData.get("action") ?? "");
  const comment = String(formData.get("comment") ?? "").trim() || null;

  const supabase = await createClient();

  const { data: approval } = await supabase.from("approvals").select("request_id").eq("id", approvalId).single();

  const { error } = await supabase.rpc("act_on_approval", {
    p_approval_id: approvalId,
    p_action: action,
    p_comment: comment,
  });
  if (error) throw new Error(error.message);

  if (approval) {
    if (action === "rejected" || action === "info_requested") {
      await notifyRequesterOfDecision(supabase, approval.request_id, action);
    } else if (action === "approved") {
      const { data: request } = await supabase
        .from("requests")
        .select("status, current_step")
        .eq("id", approval.request_id)
        .single();
      if (request?.status === "approved") {
        await notifyRequesterOfDecision(supabase, approval.request_id, "approved");
      } else if (request) {
        await notifyApproversForStep(supabase, approval.request_id, request.current_step);
      }
    }
  }

  revalidatePath("/approvals");
  revalidatePath("/requests");
}

export async function createDelegation(formData: FormData) {
  const profile = await getCurrentProfile();
  const delegateEmail = String(formData.get("delegate_email") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");

  const supabase = await createClient();
  const { data: delegate, error: lookupErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", delegateEmail)
    .single();
  if (lookupErr || !delegate) throw new Error("No user found with that email");

  const { error } = await supabase.from("delegations").insert({
    approver_id: profile.id,
    delegate_id: delegate.id,
    start_date: startDate,
    end_date: endDate,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/approvals");
}

export async function removeDelegation(formData: FormData) {
  // Authorization (own delegation, or admin) is enforced by the delegations_write RLS policy.
  const delegationId = String(formData.get("delegation_id") ?? "");
  const supabase = await createClient();

  const { error } = await supabase.from("delegations").delete().eq("id", delegationId);
  if (error) throw new Error(error.message);

  revalidatePath("/approvals");
}
