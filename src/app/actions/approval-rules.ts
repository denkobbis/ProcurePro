"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, ADMIN_ROLES, requireActiveOrg } from "@/lib/auth";

export async function createApprovalRule(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!ADMIN_ROLES.includes(profile.role)) throw new Error("Not authorized");
  await requireActiveOrg(profile);

  const departmentId = String(formData.get("department_id") ?? "").trim() || null;
  const minAmount = Number(formData.get("min_amount") ?? 0);
  const maxAmountRaw = String(formData.get("max_amount") ?? "").trim();
  const maxAmount = maxAmountRaw ? Number(maxAmountRaw) : null;
  const approverRole = String(formData.get("approver_role") ?? "");
  const stepOrder = Number(formData.get("step_order") ?? 1);

  if (!approverRole || stepOrder < 1) throw new Error("Approver role and a step order of 1 or more are required");
  if (minAmount < 0) throw new Error("Min amount cannot be negative");
  if (maxAmount !== null && maxAmount <= minAmount) throw new Error("Max amount must be greater than min amount");

  const supabase = await createClient();

  // departments RLS already scopes SELECT to the caller's own org, so a
  // department_id belonging to a different org simply won't come back —
  // same check as createUser/createBudget.
  if (departmentId) {
    const { data: dept } = await supabase.from("departments").select("id").eq("id", departmentId).maybeSingle();
    if (!dept) throw new Error("Invalid department");
  }

  const { error } = await supabase.from("approval_rules").insert({
    department_id: departmentId,
    min_amount: minAmount,
    max_amount: maxAmount,
    approver_role: approverRole,
    step_order: stepOrder,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/approval-rules");
}

export async function deleteApprovalRule(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!ADMIN_ROLES.includes(profile.role)) throw new Error("Not authorized");
  await requireActiveOrg(profile);

  const ruleId = String(formData.get("rule_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("approval_rules").delete().eq("id", ruleId);
  if (error) throw new Error(error.message);

  revalidatePath("/approval-rules");
}
