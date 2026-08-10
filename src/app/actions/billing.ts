"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getCurrentOrganization, ADMIN_ROLES } from "@/lib/auth";
import * as paystack from "@/lib/paystack";

function requirePlanCode(): string {
  const code = process.env.PAYSTACK_PLAN_CODE;
  if (!code) throw new Error("PAYSTACK_PLAN_CODE is not configured");
  return code;
}

// Redirects the admin to Paystack's hosted checkout page to enter card details
// there — this app never collects or sees a card number itself.
export async function startSubscription() {
  const profile = await getCurrentProfile();
  if (!ADMIN_ROLES.includes(profile.role)) throw new Error("Only finance/admin can manage billing");

  const org = await getCurrentOrganization(profile);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { authorization_url } = await paystack.initializeTransaction({
    email: profile.email,
    amountNaira: 25000,
    planCode: requirePlanCode(),
    callbackUrl: `${appUrl}/billing/callback`,
    metadata: { organization_id: org.id },
  });

  redirect(authorization_url);
}

// Sets status to canceled immediately for fast UI feedback, same reasoning as
// the checkout callback — the subscription.disable webhook is still the
// authoritative confirmation once it lands.
export async function cancelSubscription() {
  const profile = await getCurrentProfile();
  if (!ADMIN_ROLES.includes(profile.role)) throw new Error("Only finance/admin can manage billing");

  const org = await getCurrentOrganization(profile);
  if (!org.paystack_subscription_code || !org.paystack_email_token) {
    throw new Error("No active subscription to cancel");
  }

  await paystack.disableSubscription(org.paystack_subscription_code, org.paystack_email_token);

  const supabase = await createClient();
  await supabase.from("organizations").update({ subscription_status: "canceled" }).eq("id", org.id);

  redirect("/billing?status=canceled");
}
