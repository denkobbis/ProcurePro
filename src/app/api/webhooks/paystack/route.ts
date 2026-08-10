import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/paystack";
import { recomputePoPaymentStatus } from "@/lib/po-payment-status";

type PaystackEvent = {
  event: string;
  data: {
    reference?: string;
    transfer_code?: string;
    status?: string;
    reason?: string;
    subscription_code?: string;
    email_token?: string;
    customer?: { customer_code?: string };
    next_payment_date?: string;
  };
};

// Handles vendor payout status (transfer.*) — see actions/payments.ts.
async function handleTransferEvent(supabase: ReturnType<typeof createAdminClient>, event: PaystackEvent) {
  const reference = event.data.transfer_code ?? event.data.reference;
  if (!reference) return;

  const { data: payment } = await supabase
    .from("payments")
    .select("id, purchase_order_id")
    .eq("provider_reference", reference)
    .eq("provider", "paystack")
    .maybeSingle();
  if (!payment) return;

  if (event.event === "transfer.success") {
    await supabase
      .from("payments")
      .update({ status: "success", completed_at: new Date().toISOString(), raw_webhook_payload: event })
      .eq("id", payment.id);
    await recomputePoPaymentStatus(supabase, payment.purchase_order_id);
  } else if (event.event === "transfer.failed" || event.event === "transfer.reversed") {
    const status = event.event === "transfer.reversed" ? "reversed" : "failed";
    await supabase
      .from("payments")
      .update({ status, failure_reason: event.data.reason ?? null, raw_webhook_payload: event })
      .eq("id", payment.id);
    await recomputePoPaymentStatus(supabase, payment.purchase_order_id, "failed");
  }
}

// Handles subscription lifecycle for organizations — see actions/billing.ts.
// Matched by paystack_customer_code, set when the checkout callback first
// verifies the transaction (see billing/callback/page.tsx).
async function handleSubscriptionEvent(supabase: ReturnType<typeof createAdminClient>, event: PaystackEvent) {
  const customerCode = event.data.customer?.customer_code;
  if (!customerCode) return;

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("paystack_customer_code", customerCode)
    .maybeSingle();
  if (!org) return;

  if (event.event === "subscription.create") {
    await supabase
      .from("organizations")
      .update({
        subscription_status: "active",
        paystack_subscription_code: event.data.subscription_code ?? null,
        paystack_email_token: event.data.email_token ?? null,
        current_period_end: event.data.next_payment_date ?? null,
      })
      .eq("id", org.id);
  } else if (event.event === "charge.success") {
    // A recurring renewal charge succeeding — keep the org active and push
    // the period end out. (The very first charge is also handled by the
    // callback page for immediate feedback; this is harmless to repeat.)
    await supabase
      .from("organizations")
      .update({ subscription_status: "active", current_period_end: event.data.next_payment_date ?? null })
      .eq("id", org.id);
  } else if (event.event === "invoice.payment_failed") {
    await supabase.from("organizations").update({ subscription_status: "past_due" }).eq("id", org.id);
  } else if (event.event === "subscription.disable") {
    await supabase.from("organizations").update({ subscription_status: "canceled" }).eq("id", org.id);
  }
}

// Paystack calls this for both transfer (vendor payout) and subscription
// (billing) events — one webhook URL for the whole account. Runs with the
// service-role client — there's no signed-in user here, only a verified signature.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as PaystackEvent;
  const supabase = createAdminClient();

  if (event.event.startsWith("transfer.")) {
    await handleTransferEvent(supabase, event);
  } else if (["subscription.create", "subscription.disable", "charge.success", "invoice.payment_failed"].includes(event.event)) {
    await handleSubscriptionEvent(supabase, event);
  }

  return NextResponse.json({ received: true });
}
