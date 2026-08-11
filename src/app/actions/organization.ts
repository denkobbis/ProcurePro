"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getCurrentOrganization, ADMIN_ROLES, requireActiveOrg } from "@/lib/auth";
import { INDUSTRIES } from "@/lib/industries";
import type { OrganizationIndustry } from "@/lib/database.types";

export async function updateOrganizationSettings(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!ADMIN_ROLES.includes(profile.role)) throw new Error("Not authorized");
  await requireActiveOrg(profile);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Organization name is required");

  const industry = String(formData.get("industry") ?? "") as OrganizationIndustry;
  if (!(industry in INDUSTRIES)) throw new Error("Invalid industry");

  const org = await getCurrentOrganization(profile);
  const supabase = await createClient();
  const { error } = await supabase.from("organizations").update({ name, industry }).eq("id", org.id);
  if (error) throw new Error(error.message);

  revalidatePath("/billing");
}
