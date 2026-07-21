"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentProfile, ADMIN_ROLES } from "@/lib/auth";
import type { UserRole } from "@/lib/database.types";

export async function createDepartment(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!ADMIN_ROLES.includes(profile.role)) throw new Error("Not authorized");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Department name is required");

  const supabase = await createClient();
  const { error } = await supabase.from("departments").insert({ name });
  if (error) throw new Error(error.message);

  revalidatePath("/users");
}

export async function createUser(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!ADMIN_ROLES.includes(profile.role)) throw new Error("Not authorized");

  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "requester") as UserRole;
  const departmentId = String(formData.get("department_id") ?? "") || null;
  const password = String(formData.get("password") ?? "");

  if (!email || !fullName || !password) throw new Error("Email, name, and a temporary password are required");
  if (password.length < 8) throw new Error("Temporary password must be at least 8 characters");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role, department_id: departmentId },
  });
  if (error) throw new Error(error.message);

  revalidatePath("/users");
}

export async function deactivateUser(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!ADMIN_ROLES.includes(profile.role)) throw new Error("Not authorized");

  const userId = String(formData.get("user_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ is_active: false }).eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/users");
}

// Doesn't touch RigSource at all — just records that an admin shared the
// invite link with this person, so the table can show who's been told.
export async function grantRigSourceAccess(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!ADMIN_ROLES.includes(profile.role)) throw new Error("Not authorized");

  const userId = String(formData.get("user_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ rigsource_invited_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/users");
}
