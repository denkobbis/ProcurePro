"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, PROCUREMENT_ROLES } from "@/lib/auth";

export async function createEquipmentAsset(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!PROCUREMENT_ROLES.includes(profile.role)) throw new Error("Not authorized");

  const assetTag = String(formData.get("asset_tag") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const dayRateNgn = Number(formData.get("day_rate_ngn") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!assetTag || !name || !category) throw new Error("Asset tag, name, and category are required");

  const supabase = await createClient();
  const { data: asset, error } = await supabase
    .from("equipment_assets")
    .insert({ asset_tag: assetTag, name, category, day_rate_ngn: dayRateNgn, notes, created_by: profile.id })
    .select()
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/equipment");
  redirect(`/equipment/${asset.id}`);
}

export async function leaseOutEquipment(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!PROCUREMENT_ROLES.includes(profile.role)) throw new Error("Not authorized");

  const assetId = String(formData.get("asset_id") ?? "");
  const clientName = String(formData.get("client_name") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "");
  const expectedReturnDate = String(formData.get("expected_return_date") ?? "");
  const dayRateNgn = Number(formData.get("day_rate_ngn") ?? 0);

  if (!clientName || !startDate || !expectedReturnDate) {
    throw new Error("Client name, start date, and expected return date are required");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("lease_out_equipment", {
    p_asset_id: assetId,
    p_client_name: clientName,
    p_start_date: startDate,
    p_expected_return_date: expectedReturnDate,
    p_day_rate_ngn: dayRateNgn,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/equipment/${assetId}`);
  revalidatePath("/equipment");
}

export async function markEquipmentReturned(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!PROCUREMENT_ROLES.includes(profile.role)) throw new Error("Not authorized");

  const assetId = String(formData.get("asset_id") ?? "");
  const leaseId = String(formData.get("lease_id") ?? "");
  const returnCondition = String(formData.get("return_condition") ?? "").trim() || null;
  const inspectionPass = formData.get("inspection_pass") === "on";

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_equipment_returned", {
    p_lease_id: leaseId,
    p_return_condition: returnCondition,
    p_inspection_pass: inspectionPass,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/equipment/${assetId}`);
  revalidatePath("/equipment");
}
