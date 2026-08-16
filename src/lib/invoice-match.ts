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
 * Matching is best-effort: exact description match first, then remaining
 * lines paired by position — there's no shared key between an invoice line
 * and a PO line, so this is a starting point for a human to confirm, not an
 * authoritative link.
 */
export function matchInvoiceToPo(invoiceLines: InvoiceLineItem[], poLines: PoLineItem[]): InvoiceMatchSummary {
  const remainingPoLines = [...poLines];
  const lines: LineMatchResult[] = [];

  for (const invoiceLine of invoiceLines) {
    const normalizedDesc = invoiceLine.description.trim().toLowerCase();
    let matchIndex = remainingPoLines.findIndex((p) => p.description.trim().toLowerCase() === normalizedDesc);
    if (matchIndex === -1 && remainingPoLines.length > 0) matchIndex = 0;

    const poLine = matchIndex >= 0 ? remainingPoLines.splice(matchIndex, 1)[0] : null;

    const qtyOverPo = poLine ? invoiceLine.qty > poLine.qty : false;
    const qtyOverReceived = poLine ? invoiceLine.qty > poLine.received_qty : false;
    const priceVariancePercent =
      poLine && poLine.unit_price > 0 ? Math.round((invoiceLine.unit_price / poLine.unit_price - 1) * 1000) / 10 : null;

    lines.push({
      invoiceLine,
      poLine,
      qtyOverPo,
      qtyOverReceived,
      priceVariancePercent,
      notOnPo: !poLine,
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
    totalVariance: Math.round((invoiceTotal - poTotal) * 100) / 100,
    hasIssues,
  };
}
