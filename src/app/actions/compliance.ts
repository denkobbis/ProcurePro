"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, PROCUREMENT_ROLES, requireActiveOrg } from "@/lib/auth";

export async function createComplianceRule(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!PROCUREMENT_ROLES.includes(profile.role)) throw new Error("Not authorized");
  await requireActiveOrg(profile);

  const category = String(formData.get("category") ?? "").trim();
  if (!category) throw new Error("Category is required");

  const minRaw = String(formData.get("minimum_local_content_percentage") ?? "").trim();
  const minimumLocalContentPercentage = minRaw ? Number(minRaw) : null;
  if (minimumLocalContentPercentage != null && (minimumLocalContentPercentage < 0 || minimumLocalContentPercentage > 100)) {
    throw new Error("Minimum local content % must be between 0 and 100");
  }

  const requiresCertificate = formData.get("requires_certificate") === "on";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const supabase = await createClient();

  // The DB unique constraint is case-sensitive, but evaluateVendorCompliance
  // matches categories case-insensitively — without this check, "Fabrication"
  // and "fabrication" could both exist as separate rules and a vendor would
  // silently get rated against whichever one happens to sort first.
  const { data: existing } = await supabase.from("ncdmb_compliance_rules").select("category");
  if ((existing ?? []).some((r) => r.category.toLowerCase() === category.toLowerCase())) {
    throw new Error(`A rule for "${category}" already exists (category names are case-insensitive).`);
  }

  const { error } = await supabase.from("ncdmb_compliance_rules").insert({
    category,
    minimum_local_content_percentage: minimumLocalContentPercentage,
    requires_certificate: requiresCertificate,
    notes,
    created_by: profile.id,
  });
  if (error) throw new Error(error.message.includes("duplicate key") ? `A rule for "${category}" already exists.` : error.message);

  revalidatePath("/compliance");
}

export async function updateComplianceRule(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!PROCUREMENT_ROLES.includes(profile.role)) throw new Error("Not authorized");
  await requireActiveOrg(profile);

  const ruleId = String(formData.get("rule_id") ?? "");
  const minRaw = String(formData.get("minimum_local_content_percentage") ?? "").trim();
  const minimumLocalContentPercentage = minRaw ? Number(minRaw) : null;
  if (minimumLocalContentPercentage != null && (minimumLocalContentPercentage < 0 || minimumLocalContentPercentage > 100)) {
    throw new Error("Minimum local content % must be between 0 and 100");
  }
  const requiresCertificate = formData.get("requires_certificate") === "on";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("ncdmb_compliance_rules")
    .update({ minimum_local_content_percentage: minimumLocalContentPercentage, requires_certificate: requiresCertificate, notes })
    .eq("id", ruleId);
  if (error) throw new Error(error.message);

  revalidatePath("/compliance");
}

export async function deleteComplianceRule(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!PROCUREMENT_ROLES.includes(profile.role)) throw new Error("Not authorized");
  await requireActiveOrg(profile);

  const ruleId = String(formData.get("rule_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("ncdmb_compliance_rules").delete().eq("id", ruleId);
  if (error) throw new Error(error.message);

  revalidatePath("/compliance");
}
