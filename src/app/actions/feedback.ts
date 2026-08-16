"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export async function submitFeedback(formData: FormData) {
  const profile = await getCurrentProfile();

  const message = String(formData.get("message") ?? "").trim();
  const pagePath = String(formData.get("page_path") ?? "").trim() || null;
  if (!message) throw new Error("Say a bit about what's on your mind first.");
  if (message.length > 4000) throw new Error("Keep it under 4000 characters.");

  const supabase = await createClient();
  const { error } = await supabase.from("feedback").insert({
    organization_id: profile.organization_id,
    user_id: profile.id,
    message,
    page_path: pagePath,
  });
  if (error) throw new Error(error.message);
}
