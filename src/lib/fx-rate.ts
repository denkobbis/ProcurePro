const FX_API_TIMEOUT_MS = 5000;

/**
 * Free, no-key exchange rate lookup (exchangerate-api.com's open endpoint,
 * daily-updated, ECB/major-bank sourced) — a reasonable default data source
 * for an advisory NGN-exposure estimate, not a treasury/hedging tool. Never
 * throws; returns null on any failure so a slow/down FX API can't break the
 * purchase-orders page.
 */
export async function getCurrentRateToNgn(currency: string): Promise<number | null> {
  if (currency === "NGN") return 1;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FX_API_TIMEOUT_MS);
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${currency}`, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data?.rates?.NGN;
    return typeof rate === "number" ? rate : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
