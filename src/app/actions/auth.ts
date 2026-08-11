"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const SIGNUP_MAX_PER_HOUR = 5;

async function checkSignupRateLimit(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "unknown";

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("signup_attempts")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ip)
    .gte("created_at", oneHourAgo);

  if ((count ?? 0) >= SIGNUP_MAX_PER_HOUR) {
    redirect(`/signup?error=${encodeURIComponent("Too many signup attempts from this network. Please try again in an hour.")}`);
  }

  return ip;
}

// Self-serve signup: creates a brand-new organization and makes this user its
// first super_admin. Existing companies get new teammates via an admin invite
// (see actions/users.ts createUser) instead — this path is only for founding
// a new tenant. See supabase/migrations/0012_multi_tenancy.sql's handle_new_user().
export async function signUp(formData: FormData) {
  const organizationName = String(formData.get("organization_name") ?? "").trim();
  const industry = String(formData.get("industry") ?? "general").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!organizationName || !fullName || !email || !password) {
    redirect(`/signup?error=${encodeURIComponent("Please fill in every field")}`);
  }
  if (password.length < 8) {
    redirect(`/signup?error=${encodeURIComponent("Password must be at least 8 characters")}`);
  }

  const supabase = await createClient();
  const ip = await checkSignupRateLimit(supabase);
  await supabase.from("signup_attempts").insert({ ip_address: ip });
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        create_organization_name: organizationName,
        industry,
      },
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  // If email confirmation is required, there's no session yet — send them to
  // sign in once they've confirmed rather than bouncing off a protected route.
  if (!data.session) {
    redirect(`/login?message=${encodeURIComponent("Check your email to confirm your account, then sign in.")}`);
  }

  redirect("/dashboard");
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
