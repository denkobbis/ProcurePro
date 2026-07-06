"use client";

import { useState } from "react";

export interface LineItemInput {
  description: string;
  qty: string;
  unitPrice: string;
}

export default function LineItemsEditor({ initialItems }: { initialItems: LineItemInput[] }) {
  const [items, setItems] = useState<LineItemInput[]>(
    initialItems.length ? initialItems : [{ description: "", qty: "1", unitPrice: "0" }]
  );

  function updateItem(index: number, field: keyof LineItemInput, value: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", qty: "1", unitPrice: "0" }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="hidden text-xs font-medium text-zinc-500 sm:grid sm:grid-cols-12 sm:gap-2">
        <span className="col-span-6">Description</span>
        <span className="col-span-2">Qty</span>
        <span className="col-span-3">Unit price (₦)</span>
        <span className="col-span-1"></span>
      </div>
      <div className="mt-1 space-y-3 sm:space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-md border border-zinc-100 p-3 sm:grid sm:grid-cols-12 sm:border-0 sm:p-0"
          >
            <input
              name="line_description"
              placeholder="Description"
              value={item.description}
              onChange={(e) => updateItem(i, "description", e.target.value)}
              required
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm sm:col-span-6"
            />
            <div className="flex gap-2 sm:contents">
              <input
                name="line_qty"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Qty"
                value={item.qty}
                onChange={(e) => updateItem(i, "qty", e.target.value)}
                required
                className="w-full min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm sm:col-span-2 sm:flex-none"
              />
              <input
                name="line_unit_price"
                type="number"
                step="0.01"
                min="0"
                placeholder="Unit price (₦)"
                value={item.unitPrice}
                onChange={(e) => updateItem(i, "unitPrice", e.target.value)}
                required
                className="w-full min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm sm:col-span-3 sm:flex-none"
              />
            </div>
            <button
              type="button"
              onClick={() => removeItem(i)}
              disabled={items.length === 1}
              className="self-start text-xs text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-30 sm:col-span-1 sm:self-center"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addItem} className="mt-2 text-xs text-zinc-600 hover:underline">
        + Add line item
      </button>
    </div>
  );
}
