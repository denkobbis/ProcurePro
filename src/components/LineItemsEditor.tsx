"use client";

import { useState } from "react";

export interface LineItemInput {
  description: string;
  qty: string;
  unitPrice: string;
  mpn?: string;
  oemBrand?: string;
}

export default function LineItemsEditor({ initialItems }: { initialItems: LineItemInput[] }) {
  const [items, setItems] = useState<LineItemInput[]>(
    initialItems.length ? initialItems : [{ description: "", qty: "1", unitPrice: "0", mpn: "", oemBrand: "" }]
  );

  function updateItem(index: number, field: keyof LineItemInput, value: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", qty: "1", unitPrice: "0", mpn: "", oemBrand: "" }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded-md border border-zinc-100 p-3">
          <input
            name="line_description"
            placeholder="Description"
            value={item.description}
            onChange={(e) => updateItem(i, "description", e.target.value)}
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              name="line_mpn"
              placeholder="Manufacturer part number (optional)"
              value={item.mpn ?? ""}
              onChange={(e) => updateItem(i, "mpn", e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
            <input
              name="line_oem_brand"
              placeholder="OEM brand (optional)"
              value={item.oemBrand ?? ""}
              onChange={(e) => updateItem(i, "oemBrand", e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              name="line_qty"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Qty"
              value={item.qty}
              onChange={(e) => updateItem(i, "qty", e.target.value)}
              required
              className="w-24 min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm sm:flex-none"
            />
            <input
              name="line_unit_price"
              type="number"
              step="0.01"
              min="0"
              placeholder="Unit price"
              value={item.unitPrice}
              onChange={(e) => updateItem(i, "unitPrice", e.target.value)}
              required
              className="w-32 min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm sm:flex-none"
            />
            <button
              type="button"
              onClick={() => removeItem(i)}
              disabled={items.length === 1}
              className="ml-auto text-xs text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-30"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={addItem} className="text-xs text-zinc-600 hover:underline">
        + Add line item
      </button>
    </div>
  );
}
