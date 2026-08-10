// Thin wrapper around Paystack's REST API (no SDK dependency needed for the
// handful of endpoints we use). Unlike email, this is NOT optional
// infrastructure — a missing key throws, because a caller triggering a
// payment needs to know it didn't happen, not have it silently no-op.
import crypto from "crypto";

const BASE_URL = "https://api.paystack.co";

function requireSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return key;
}

async function paystackFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireSecretKey()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = await res.json();
  if (!res.ok || body.status === false) {
    throw new Error(body.message || `Paystack request failed (${res.status})`);
  }
  return body.data as T;
}

export async function initializeTransaction(params: {
  email: string;
  amountNaira: number;
  planCode: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<{ authorization_url: string; reference: string }> {
  return paystackFetch("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: Math.round(params.amountNaira * 100),
      plan: params.planCode,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
  });
}

export interface PaystackTransactionData {
  status: string;
  reference: string;
  customer: { customer_code: string; email: string };
  plan_object?: { plan_code: string };
  subscription_code?: string;
}

export async function verifyTransaction(reference: string): Promise<PaystackTransactionData> {
  return paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);
}

export async function disableSubscription(subscriptionCode: string, emailToken: string): Promise<void> {
  await paystackFetch("/subscription/disable", {
    method: "POST",
    body: JSON.stringify({ code: subscriptionCode, token: emailToken }),
  });
}

export interface PaystackBank {
  name: string;
  code: string;
  currency: string;
}

export async function listBanks(): Promise<PaystackBank[]> {
  return paystackFetch<PaystackBank[]>("/bank?currency=NGN&country=nigeria");
}

export async function resolveAccountNumber(accountNumber: string, bankCode: string): Promise<{ account_number: string; account_name: string }> {
  return paystackFetch(`/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`);
}

export async function createTransferRecipient(params: {
  name: string;
  accountNumber: string;
  bankCode: string;
}): Promise<{ recipient_code: string }> {
  return paystackFetch("/transferrecipient", {
    method: "POST",
    body: JSON.stringify({
      type: "nuban",
      name: params.name,
      account_number: params.accountNumber,
      bank_code: params.bankCode,
      currency: "NGN",
    }),
  });
}

export async function initiateTransfer(params: {
  recipientCode: string;
  amountNaira: number;
  reason: string;
  reference: string;
}): Promise<{ transfer_code: string; status: string; reference: string }> {
  return paystackFetch("/transfer", {
    method: "POST",
    body: JSON.stringify({
      source: "balance",
      amount: Math.round(params.amountNaira * 100), // Paystack amounts are in kobo
      recipient: params.recipientCode,
      reason: params.reason,
      reference: params.reference,
    }),
  });
}

// Paystack requires an OTP to finalize a transfer unless the account has
// "Disable OTP for Transfers" turned on (Paystack support enables this after
// KYC). initiateTransfer's response status is "otp" when this step is needed.
export async function finalizeTransfer(transferCode: string, otp: string): Promise<{ status: string }> {
  return paystackFetch("/transfer/finalize_transfer", {
    method: "POST",
    body: JSON.stringify({ transfer_code: transferCode, otp }),
  });
}

// Paystack signs webhook bodies with HMAC-SHA512 using the secret key itself
// (no separate webhook secret to configure) — compare against x-paystack-signature.
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const expected = crypto.createHmac("sha512", requireSecretKey()).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
