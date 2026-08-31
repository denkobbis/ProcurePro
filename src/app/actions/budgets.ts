"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, ADMIN_ROLES, requireActiveOrg } from "@/lib/auth";

export async function createBudget(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!ADMIN_ROLES.includes(profile.role)) throw new Error("Not authorized");
  await requireActiveOrg(profile);

  const departmentId = String(formData.get("department_id") ?? "");
  const category = String(formData.get("category") ?? "").trim();
  const period = String(formData.get("period") ?? "monthly");
  const periodStart = String(formData.get("period_start") ?? "");
  const periodEnd = String(formData.get("period_end") ?? "");
  const allocatedAmount = Number(formData.get("allocated_amount") ?? 0);
  const hardBlock = formData.get("hard_block") === "on";

  if (!departmentId || !category || !periodStart || !periodEnd || allocatedAmount <= 0) {
    throw new Error("All budget fields are required");
  }

  const supabase = await createClient();

  // departments RLS already scopes SELECT to the caller's own org, so a
  // department_id belonging to a different org simply won't come back —
  // catches a cross-org id before it reaches the insert, matching the same
  // check in createUser.
  const { data: dept } = await supabase.from("departments").select("id").eq("id", departmentId).maybeSingle();
  if (!dept) throw new Error("Invalid department");

  const { error } = await supabase.from("budgets").upsert(
    {
      department_id: departmentId,
      category,
      period,
      period_start: periodStart,
      period_end: periodEnd,
      allocated_amount: allocatedAmount,
      hard_block: hardBlock,
      created_by: profile.id,
    },
    { onConflict: "department_id,category,period_start,period_end" }
  );
  if (error) throw new Error(error.message);

  revalidatePath("/budgets");
}
