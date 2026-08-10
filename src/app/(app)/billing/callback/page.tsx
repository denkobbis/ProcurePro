import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentOrganization } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { verifyTransaction } from "@/lib/paystack";

// Paystack sends the admin back here after checkout. The subscription itself
// is authoritatively confirmed by the subscription.create webhook (which also
// fills in current_period_end) — this just gives immediate UI feedback rather
// than making the admin wait for the webhook to land.
export default async function BillingCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;
  const profile = await getCurrentProfile();
  const org = await getCurrentOrganization(profile);

  if (!reference) redirect("/billing?status=error");

  let succeeded = false;
  try {
    const transaction = await verifyTransaction(reference);
    if (transaction.status === "success") {
      const supabase = await createClient();
      await supabase
        .from("organizations")
        .update({
          subscription_status: "active",
          paystack_customer_code: transaction.customer.customer_code,
          paystack_subscription_code: transaction.subscription_code ?? null,
        })
        .eq("id", org.id);
      succeeded = true;
    }
  } catch {
    succeeded = false;
  }

  redirect(succeeded ? "/billing?status=success" : "/billing?status=error");
}
