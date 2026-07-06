import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/database.types";

export async function getCurrentProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) redirect("/login");
  if (!(profile as Profile).is_active) {
    await supabase.auth.signOut();
    redirect("/login?error=Your+account+has+been+deactivated");
  }

  return profile as Profile;
}

export function requireRole(profile: Profile, allowed: UserRole[]) {
  if (!allowed.includes(profile.role)) {
    redirect("/dashboard?error=Not+authorized+to+view+that+page");
  }
}

export const ADMIN_ROLES: UserRole[] = ["finance_admin", "super_admin"];
export const PROCUREMENT_ROLES: UserRole[] = ["procurement_officer", "finance_admin", "super_admin"];
export const APPROVER_ROLES: UserRole[] = ["approver", "finance_admin", "super_admin"];
