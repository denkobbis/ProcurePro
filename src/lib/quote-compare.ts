import type { RfqQuote } from "@/lib/database.types";

export interface RankedQuote {
  quote: RfqQuote;
  total: number;
  isCheapest: boolean;
  isFastest: boolean;
  isRecommended: boolean;
}

/**
 * Pure arithmetic ranking — no LLM call. Cheapest/fastest/recommended are
 * exact comparisons on numbers ProcurePro already has, and a model can only
 * add hallucination risk to a sum and a min(), not value.
 */
export function rankQuotes(quotes: RfqQuote[], qty: number): RankedQuote[] {
  if (quotes.length === 0) return [];

  const ranked: RankedQuote[] = quotes.map((quote) => ({
    quote,
    total: quote.unit_price * qty,
    isCheapest: false,
    isFastest: false,
    isRecommended: false,
  }));

  // Cheapest total is only meaningful within the same currency — comparing
  // raw numbers across NGN/USD/EUR/GBP without a shared FX rate would be
  // misleading, so we rank within the majority currency only.
  const currencyCounts = new Map<string, number>();
  for (const r of ranked) currencyCounts.set(r.quote.currency, (currencyCounts.get(r.quote.currency) ?? 0) + 1);
  const majorityCurrency = [...currencyCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const comparable = ranked.filter((r) => r.quote.currency === majorityCurrency);

  const cheapest = comparable.reduce((min, r) => (r.total < min.total ? r : min), comparable[0]);
  cheapest.isCheapest = true;

  const withLeadTime = ranked.filter((r) => r.quote.lead_time_days != null);
  if (withLeadTime.length > 0) {
    const fastest = withLeadTime.reduce((min, r) => (r.quote.lead_time_days! < min.quote.lead_time_days! ? r : min), withLeadTime[0]);
    fastest.isFastest = true;
  }

  // Recommended: cheapest among comparable quotes whose lead time is within
  // 20% of the fastest — a simple, explainable "good value, not just cheap"
  // heuristic rather than an opaque weighted score.
  const fastestDays = withLeadTime.length > 0 ? Math.min(...withLeadTime.map((r) => r.quote.lead_time_days!)) : null;
  const goodValueCandidates = comparable.filter((r) => {
    if (fastestDays == null || r.quote.lead_time_days == null) return true;
    return r.quote.lead_time_days <= fastestDays * 1.2;
  });
  const recommended = goodValueCandidates.reduce((min, r) => (r.total < min.total ? r : min), goodValueCandidates[0] ?? cheapest);
  recommended.isRecommended = true;

  return ranked;
}
