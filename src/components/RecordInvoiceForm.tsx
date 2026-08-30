"use client";

import { useRef, useState } from "react";
import { recordInvoice } from "@/app/actions/invoices";
import { Button } from "@/components/Button";
import MoneyInput from "@/components/MoneyInput";
import { SparkleIcon, UploadIcon } from "@/components/icons";
import type { ExtractedInvoiceFields } from "@/lib/extract";

const CURRENCIES = ["NGN", "USD", "EUR", "GBP"] as const;
const inputClass =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

interface LineItemInput {
  description: string;
  qty: string;
  unitPrice: string;
}

export default function RecordInvoiceForm({ poId }: { poId: string }) {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [totalAmount, setTotalAmount] = useState("");
  const [items, setItems] = useState<LineItemInput[]>([{ description: "", qty: "1", unitPrice: "0" }]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    setStatus("loading");
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/extract-invoice", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed.");
      const fields = data.fields as ExtractedInvoiceFields;
      if (fields.invoice_number) setInvoiceNumber(fields.invoice_number);
      if (fields.invoice_date) setInvoiceDate(fields.invoice_date);
      if (fields.total_amount > 0) setTotalAmount(String(fields.total_amount));
      if (fields.line_items?.length) {
        setItems(fields.line_items.map((li) => ({ description: li.description, qty: String(li.qty), unitPrice: String(li.unit_price) })));
      }
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Extraction failed.");
    }
  }

  function updateItem(i: number, field: keyof LineItemInput, value: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { description: "", qty: "1", unitPrice: "0" }]);
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <form action={recordInvoice} className="space-y-4">
      <input type="hidden" name="po_id" value={poId} />

      <div className="rounded-lg border border-dashed border-brand-300 bg-brand-50/50 p-4 dark:border-brand-500/30 dark:bg-brand-500/5">
        <div className="flex items-start gap-3">
          <SparkleIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Fill this in for me</p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Upload the vendor&apos;s invoice (PDF or image) and the fields below will be filled in for you to review — nothing is saved until you submit.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Button type="button" variant="secondary" size="sm" disabled={status === "loading"} onClick={() => fileInputRef.current?.click()}>
                <UploadIcon className="h-4 w-4" />
                {status === "loading" ? "Reading file…" : "Upload invoice"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                name="attachment"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              {fileName && <span className="text-xs text-zinc-500 dark:text-zinc-400">{fileName}</span>}
            </div>
            {status === "done" && <p className="mt-2 text-xs font-medium text-green-700 dark:text-green-400">Filled in below — check it over before saving.</p>}
            {status === "error" && <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="invoice-number-field" className="block text-xs text-zinc-500 dark:text-zinc-400">Invoice number</label>
          <input id="invoice-number-field" name="invoice_number" required value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className={`mt-1 w-full ${inputClass}`} />
        </div>
        <div>
          <label htmlFor="invoice-date-field" className="block text-xs text-zinc-500 dark:text-zinc-400">Invoice date</label>
          <input id="invoice-date-field" name="invoice_date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={`mt-1 w-full ${inputClass}`} />
        </div>
        <div>
          <label htmlFor="invoice-currency-field" className="block text-xs text-zinc-500 dark:text-zinc-400">Currency</label>
          <select id="invoice-currency-field" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={`mt-1 w-full ${inputClass}`}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-4">
          <label htmlFor="invoice-total-field" className="block text-xs text-zinc-500 dark:text-zinc-400">Invoice total</label>
          <MoneyInput
            id="invoice-total-field"
            name="total_amount"
            required
            value={totalAmount}
            onChange={setTotalAmount}
            className={`mt-1 w-40 ${inputClass}`}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs text-zinc-500 dark:text-zinc-400">Line items</label>
        {items.map((item, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-100 p-2 dark:border-zinc-800">
            <input
              name="line_description"
              placeholder="Description"
              value={item.description}
              onChange={(e) => updateItem(i, "description", e.target.value)}
              required
              className={`min-w-0 flex-1 ${inputClass}`}
            />
            <input
              name="line_qty"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Qty"
              value={item.qty}
              onChange={(e) => updateItem(i, "qty", e.target.value)}
              required
              className={`w-20 ${inputClass}`}
            />
            <MoneyInput
              name="line_unit_price"
              placeholder="Unit price"
              value={item.unitPrice}
              onChange={(raw) => updateItem(i, "unitPrice", raw)}
              required
              className={`w-28 ${inputClass}`}
            />
            <button
              type="button"
              onClick={() => removeItem(i)}
              disabled={items.length === 1}
              aria-label={`Remove line item ${i + 1}`}
              className="text-xs text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-30 dark:text-red-400"
            >
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={addItem} className="text-xs text-zinc-600 hover:underline dark:text-zinc-400">
          + Add line item
        </button>
      </div>

      <Button type="submit" size="sm">
        Record invoice
      </Button>
    </form>
  );
}
