import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole, Organization } from "@/lib/database.types";

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

export async function getCurrentOrganization(profile: Profile): Promise<Organization> {
  const supabase = await createClient();
  const { data: org, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.organization_id)
    .single();
  if (error || !org) throw new Error("Organization not found");
  return org as Organization;
}

// Trial expiry is time-based (trial_ends_at passing) rather than a status the
// database flips on its own, so this checks both the stored status and the clock.
export function isOrgLocked(org: Organization): boolean {
  if (org.subscription_status === "past_due" || org.subscription_status === "canceled") return true;
  if (org.subscription_status === "trialing" && new Date(org.trial_ends_at) < new Date()) return true;
  return false;
}

// Call at the top of any mutating server action. Read-only access (viewing
// pages) stays available when locked — this only blocks writes.
export async function requireActiveOrg(profile: Profile) {
  const org = await getCurrentOrganization(profile);
  if (isOrgLocked(org)) {
    throw new Error(
      org.subscription_status === "trialing"
        ? "Your free trial has ended. Subscribe on the Billing page to keep making changes."
        : "Your subscription needs attention. Visit the Billing page to keep making changes."
    );
  }
}
