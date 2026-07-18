"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, PROCUREMENT_ROLES } from "@/lib/auth";

export async function createVendor(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!PROCUREMENT_ROLES.includes(profile.role)) throw new Error("Not authorized");

  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const contactEmail = String(formData.get("contact_email") ?? "").trim() || null;
  const contactPhone = String(formData.get("contact_phone") ?? "").trim() || null;
  const paymentTerms = String(formData.get("payment_terms") ?? "").trim() || null;
  const isApproved = formData.get("is_approved") === "on";
  const defaultCurrency = String(formData.get("default_currency") ?? "NGN");
  const ncdmbCompliant = formData.get("ncdmb_compliant") === "on";
  const ncdmbCertificateNumber = String(formData.get("ncdmb_certificate_number") ?? "").trim() || null;
  const ncdmbCertificateExpiry = String(formData.get("ncdmb_certificate_expiry") ?? "") || null;
  const localContentRaw = String(formData.get("local_content_percentage") ?? "").trim();
  const localContentPercentage = localContentRaw ? Number(localContentRaw) : null;

  if (!name) throw new Error("Vendor name is required");

  const supabase = await createClient();
  const { data: vendor, error } = await supabase
    .from("vendors")
    .insert({
      name,
      category,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      payment_terms: paymentTerms,
      is_approved: isApproved,
      default_currency: defaultCurrency,
      ncdmb_compliant: ncdmbCompliant,
      ncdmb_certificate_number: ncdmbCertificateNumber,
      ncdmb_certificate_expiry: ncdmbCertificateExpiry,
      local_content_percentage: localContentPercentage,
      created_by: profile.id,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/vendors");
  redirect(`/vendors/${vendor.id}`);
}

export async function updateVendorApproval(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!PROCUREMENT_ROLES.includes(profile.role)) throw new Error("Not authorized");

  const vendorId = String(formData.get("vendor_id") ?? "");
  const isApproved = formData.get("is_approved") === "on";

  const supabase = await createClient();
  const { error } = await supabase.from("vendors").update({ is_approved: isApproved }).eq("id", vendorId);
  if (error) throw new Error(error.message);

  revalidatePath(`/vendors/${vendorId}`);
}

export async function updateVendorCompliance(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!PROCUREMENT_ROLES.includes(profile.role)) throw new Error("Not authorized");

  const vendorId = String(formData.get("vendor_id") ?? "");
  const defaultCurrency = String(formData.get("default_currency") ?? "NGN");
  const ncdmbCompliant = formData.get("ncdmb_compliant") === "on";
  const ncdmbCertificateNumber = String(formData.get("ncdmb_certificate_number") ?? "").trim() || null;
  const ncdmbCertificateExpiry = String(formData.get("ncdmb_certificate_expiry") ?? "") || null;
  const localContentRaw = String(formData.get("local_content_percentage") ?? "").trim();
  const localContentPercentage = localContentRaw ? Number(localContentRaw) : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("vendors")
    .update({
      default_currency: defaultCurrency,
      ncdmb_compliant: ncdmbCompliant,
      ncdmb_certificate_number: ncdmbCertificateNumber,
      ncdmb_certificate_expiry: ncdmbCertificateExpiry,
      local_content_percentage: localContentPercentage,
    })
    .eq("id", vendorId);
  if (error) throw new Error(error.message);

  revalidatePath(`/vendors/${vendorId}`);
}

export async function updatePerformanceNotes(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!PROCUREMENT_ROLES.includes(profile.role)) throw new Error("Not authorized");

  const vendorId = String(formData.get("vendor_id") ?? "");
  const notes = String(formData.get("performance_notes") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.from("vendors").update({ performance_notes: notes }).eq("id", vendorId);
  if (error) throw new Error(error.message);

  revalidatePath(`/vendors/${vendorId}`);
}

export async function uploadVendorDocument(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!PROCUREMENT_ROLES.includes(profile.role)) throw new Error("Not authorized");

  const vendorId = String(formData.get("vendor_id") ?? "");
  const file = formData.get("document") as File | null;
  if (!file || file.size === 0) return;
  const documentType = String(formData.get("document_type") ?? "").trim() || undefined;
  const expiryDate = String(formData.get("expiry_date") ?? "") || null;

  const supabase = await createClient();
  const path = `vendors/${vendorId}/${Date.now()}-${file.name}`;
  const { error: uploadErr } = await supabase.storage.from("attachments").upload(path, file);
  if (uploadErr) throw new Error(uploadErr.message);

  const { data: vendor } = await supabase.from("vendors").select("documents").eq("id", vendorId).single();
  const documents = [
    ...(vendor?.documents ?? []),
    { file_path: path, file_name: file.name, uploaded_at: new Date().toISOString(), document_type: documentType, expiry_date: expiryDate },
  ];

  const { error } = await supabase.from("vendors").update({ documents }).eq("id", vendorId);
  if (error) throw new Error(error.message);

  revalidatePath(`/vendors/${vendorId}`);
}
