import { formatMoney } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";
import { NotePanel } from "@/components/RecordPanels";
import type { InvoiceMatchSummary } from "@/lib/invoice-match";
import type { Invoice } from "@/lib/database.types";

export default function InvoiceMatchPanel({ invoice, match }: { invoice: Invoice; match: InvoiceMatchSummary }) {
  const issues = match.lines.filter(
    (l) => l.notOnPo || l.qtyOverPo || l.qtyOverReceived || (l.priceVariancePercent !== null && Math.abs(l.priceVariancePercent) > 2)
  );

  return (
    <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{invoice.invoice_number}</span>
          {invoice.invoice_date && <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500">{invoice.invoice_date}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm tabular-nums text-zinc-900 dark:text-zinc-100">{formatMoney(invoice.total_amount, invoice.currency)}</span>
          <StatusBadge status={invoice.status} />
        </div>
      </div>

      {issues.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Every line matches the PO — quantities are within what was ordered and received.</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {issues.map((l, i) => (
            <NotePanel key={i} tone="warn">
              {l.notOnPo && <>&ldquo;{l.invoiceLine.description}&rdquo; isn&apos;t a line item on this PO.</>}
              {!l.notOnPo && l.qtyOverReceived && (
                <>
                  Billed {l.invoiceLine.qty} of &ldquo;{l.invoiceLine.description}&rdquo; but only {l.poLine?.received_qty ?? 0} has been received so far.
                </>
              )}
              {!l.notOnPo && !l.qtyOverReceived && l.qtyOverPo && (
                <>
                  Billed {l.invoiceLine.qty} of &ldquo;{l.invoiceLine.description}&rdquo; — more than the {l.poLine?.qty} ordered.
                </>
              )}
              {!l.notOnPo && l.priceVariancePercent !== null && Math.abs(l.priceVariancePercent) > 2 && (
                <>
                  {" "}
                  Unit price is {l.priceVariancePercent > 0 ? "up" : "down"} {Math.abs(l.priceVariancePercent)}% vs. the PO&apos;s {formatMoney(l.poLine?.unit_price ?? 0, invoice.currency)}.
                </>
              )}
            </NotePanel>
          ))}
        </div>
      )}
    </div>
  );
}
