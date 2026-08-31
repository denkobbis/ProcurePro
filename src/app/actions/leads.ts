"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type SubmitDemoRequestResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEMO_REQUEST_MAX_PER_HOUR = 10;

async function getClientIp(): Promise<string> {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "unknown";
}

/**
 * Captures a "request a demo" lead from the marketing site. Auth-optional:
 * anonymous visitors can post here — the RLS insert policy on marketing_leads
 * (migration 0034) allows anon + authenticated.
 */
export async function submitDemoRequest(formData: FormData): Promise<SubmitDemoRequestResult> {
  const name = String(formData.get("name") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const message = String(formData.get("message") ?? "").trim() || null;
  const utmSource = String(formData.get("utm_source") ?? "").trim() || null;
  const utmMedium = String(formData.get("utm_medium") ?? "").trim() || null;
  const utmCampaign = String(formData.get("utm_campaign") ?? "").trim() || null;

  // Honeypot: a real visitor never sees this hidden field, bots fill it.
  // Pretend success so spam scripts think they landed, then drop the record.
  if (formData.get("company_website")) return { ok: true };

  if (!name || !company || !email) {
    return { ok: false, error: "Add your name, company, and work email so we can get back to you." };
  }
  if (name.length > 120 || company.length > 120) {
    return { ok: false, error: "Keep your name and company under 120 characters." };
  }
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return { ok: false, error: "That email doesn't look right — double-check it." };
  }
  if (phone && phone.length > 40) {
    return { ok: false, error: "Keep your phone number under 40 characters." };
  }
  if (message && message.length > 1000) {
    return { ok: false, error: "Keep your note under 1000 characters." };
  }

  const supabase = await createClient();

  const ip = await getClientIp();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentCount } = await supabase.rpc("count_auth_attempts", {
    p_ip_address: ip,
    p_attempt_type: "demo_request",
    p_since: oneHourAgo,
  });
  if ((recentCount ?? 0) >= DEMO_REQUEST_MAX_PER_HOUR) {
    return { ok: false, error: "Too many requests from this network — try again in an hour." };
  }
  await supabase.from("auth_attempts").insert({ ip_address: ip, attempt_type: "demo_request" });

  const { error } = await supabase.from("marketing_leads").insert({
    name,
    company,
    email,
    phone,
    message,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
  });
  if (error) {
    console.error("submitDemoRequest insert failed:", error.message);
    return { ok: false, error: "Couldn't save that just now — try again in a moment." };
  }
  return { ok: true };
}