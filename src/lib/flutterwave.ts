// Thin wrapper around Flutterwave's REST API (no SDK dependency needed for
// the handful of endpoints we use). Unlike email, this is NOT optional
// infrastructure — a missing key throws, because a caller triggering a
// payment needs to know it didn't happen, not have it silently no-op.
const BASE_URL = "https://api.flutterwave.com/v3";

function requireSecretKey(): string {
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) throw new Error("FLUTTERWAVE_SECRET_KEY is not configured");
  return key;
}

async function flutterwaveFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireSecretKey()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = await res.json();
  if (!res.ok || body.status === "error") {
    throw new Error(body.message || `Flutterwave request failed (${res.status})`);
  }
  return body.data as T;
}

export interface FlutterwaveBank {
  name: string;
  code: string;
}

export async function listBanks(): Promise<FlutterwaveBank[]> {
  return flutterwaveFetch<FlutterwaveBank[]>("/banks/NG");
}

export async function resolveAccountNumber(accountNumber: string, bankCode: string): Promise<{ account_number: string; account_name: string }> {
  return flutterwaveFetch("/accounts/resolve", {
    method: "POST",
    body: JSON.stringify({ account_number: accountNumber, account_bank: bankCode }),
  });
}

// Flutterwave doesn't need a separate "create recipient" step — account
// details go directly on the transfer call.
export async function initiateTransfer(params: {
  bankCode: string;
  accountNumber: string;
  amountNaira: number;
  beneficiaryName: string;
  narration: string;
  reference: string;
}): Promise<{ id: number; status: string; reference: string }> {
  return flutterwaveFetch("/transfers", {
    method: "POST",
    body: JSON.stringify({
      account_bank: params.bankCode,
      account_number: params.accountNumber,
      amount: params.amountNaira,
      currency: "NGN",
      debit_currency: "NGN",
      beneficiary_name: params.beneficiaryName,
      narration: params.narration,
      reference: params.reference,
    }),
  });
}

// Flutterwave webhooks are verified by comparing the "verif-hash" header to a
// secret you set yourself in the dashboard (Settings -> Webhooks) — plain
// string equality, not an HMAC of the body like Paystack.
export function verifyWebhookSignature(signatureHeader: string | null): boolean {
  const expected = process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;
  if (!expected || !signatureHeader) return false;
  return signatureHeader === expected;
}
