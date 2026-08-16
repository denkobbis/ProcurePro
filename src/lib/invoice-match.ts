import type { InvoiceLineItem, PoLineItem } from "@/lib/database.types";

export interface LineMatchResult {
  invoiceLine: InvoiceLineItem;
  poLine: PoLineItem | null;
  qtyOverPo: boolean;
  qtyOverReceived: boolean;
  priceVariancePercent: number | null;
  notOnPo: boolean;
}

export interface InvoiceMatchSummary {
  lines: LineMatchResult[];
  unmatchedPoLines: PoLineItem[];
  totalVariance: number;
  hasIssues: boolean;
}

const PRICE_VARIANCE_THRESHOLD_PERCENT = 2;

/**
 * The classic AP "3-way match" — invoice line items checked against what was
 * actually ordered (the PO line) and what was actually received (received_qty
 * on that same line), not just the PO. Billed-but-not-received and
 * billed-above-ordered are the two checks that actually prevent overpaying a
 * vendor; price drift is flagged too but is common enough (FX, negotiated
 * discounts) that it's advisory only, like every other flag in this app.
 *
 * Matching is best-effort: exact description match only. A line with no
 * exact match is shown paired with the next unmatched PO line by position —
 * purely so the UI can display a plausible qty/price comparison — but it is
 * always flagged `notOnPo: true`, since a positional guess is not evidence
 * the line was actually ordered. (An earlier version treated the positional
 * guess itself as a match, which let a genuinely unordered line silently
 * read as clean.)
 *
 * priceVariancePercent is only computed when both currencies are known and
 * equal — comparing raw unit prices across currencies (e.g. a USD PO against
 * an NGN invoice) produces a meaningless percentage.
 */
export function matchInvoiceToPo(
  invoiceLines: InvoiceLineItem[],
  poLines: PoLineItem[],
  invoiceCurrency?: string,
  poCurrency?: string
): InvoiceMatchSummary {
  const remainingPoLines = [...poLines];
  const lines: LineMatchResult[] = [];
  const sameCurrency = !invoiceCurrency || !poCurrency || invoiceCurrency === poCurrency;

  for (const invoiceLine of invoiceLines) {
    const normalizedDesc = invoiceLine.description.trim().toLowerCase();
    const exactMatchIndex = remainingPoLines.findIndex((p) => p.description.trim().toLowerCase() === normalizedDesc);
    const isExactMatch = exactMatchIndex !== -1;
    const matchIndex = isExactMatch ? exactMatchIndex : remainingPoLines.length > 0 ? 0 : -1;

    const poLine = matchIndex >= 0 ? remainingPoLines.splice(matchIndex, 1)[0] : null;

    const qtyOverPo = poLine ? invoiceLine.qty > poLine.qty : false;
    const qtyOverReceived = poLine ? invoiceLine.qty > poLine.received_qty : false;
    const priceVariancePercent =
      poLine && poLine.unit_price > 0 && sameCurrency ? Math.round((invoiceLine.unit_price / poLine.unit_price - 1) * 1000) / 10 : null;

    lines.push({
      invoiceLine,
      poLine,
      qtyOverPo,
      qtyOverReceived,
      priceVariancePercent,
      notOnPo: !isExactMatch,
    });
  }

  const invoiceTotal = invoiceLines.reduce((sum, l) => sum + l.qty * l.unit_price, 0);
  const poTotal = poLines.reduce((sum, l) => sum + l.qty * l.unit_price, 0);

  const hasIssues = lines.some(
    (l) => l.notOnPo || l.qtyOverPo || l.qtyOverReceived || (l.priceVariancePercent !== null && Math.abs(l.priceVariancePercent) > PRICE_VARIANCE_THRESHOLD_PERCENT)
  );

  return {
    lines,
    unmatchedPoLines: remainingPoLines,
    totalVariance: sameCurrency ? Math.round((invoiceTotal - poTotal) * 100) / 100 : 0,
    hasIssues,
  };
}
