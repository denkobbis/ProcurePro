import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/flutterwave";
import { recomputePoPaymentStatus } from "@/lib/po-payment-status";

// Flutterwave calls this after a transfer settles. Runs with the service-role
// client — there's no signed-in user here, only a verified signature.
export async function POST(request: Request) {
  const signature = request.headers.get("verif-hash");
  if (!verifyWebhookSignature(signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = (await request.json()) as {
    event: string;
    data: { id?: number; reference?: string; status?: string; complete_message?: string };
  };

  const reference = event.data.id != null ? String(event.data.id) : event.data.reference;
  if (!reference) return NextResponse.json({ received: true });

  const supabase = createAdminClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id, purchase_order_id")
    .eq("provider_reference", reference)
    .eq("provider", "flutterwave")
    .maybeSingle();
  if (!payment) return NextResponse.json({ received: true });

  const status = event.data.status?.toUpperCase();
  if (status === "SUCCESSFUL") {
    await supabase
      .from("payments")
      .update({ status: "success", completed_at: new Date().toISOString(), raw_webhook_payload: event })
      .eq("id", payment.id);
    await recomputePoPaymentStatus(supabase, payment.purchase_order_id);
  } else if (status === "FAILED") {
    await supabase
      .from("payments")
      .update({ status: "failed", failure_reason: event.data.complete_message ?? null, raw_webhook_payload: event })
      .eq("id", payment.id);
    await recomputePoPaymentStatus(supabase, payment.purchase_order_id, "failed");
  }

  return NextResponse.json({ received: true });
}
