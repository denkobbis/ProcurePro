"use client";

import { useState } from "react";
import { updateVendorPayout } from "@/app/actions/payments";
import { Button } from "@/components/Button";

export default function VendorPayoutForm({
  vendorId,
  banks,
}: {
  vendorId: string;
  banks: { name: string; code: string }[];
}) {
  const [bankCode, setBankCode] = useState("");

  const selectedBank = banks.find((b) => b.code === bankCode);

  return (
    <form action={updateVendorPayout} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <input type="hidden" name="vendor_id" value={vendorId} />
      <input type="hidden" name="paystack_bank_code" value={bankCode} />
      <input type="hidden" name="bank_name" value={selectedBank?.name ?? ""} />
      <div>
        <label className="block text-xs text-zinc-500 dark:text-zinc-400">Bank</label>
        <select
          value={bankCode}
          onChange={(e) => setBankCode(e.target.value)}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="">Select bank</option>
          {banks.map((b) => (
            <option key={`${b.code}-${b.name}`} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-zinc-500 dark:text-zinc-400">Account number</label>
        <input
          name="account_number"
          required
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>
      <div className="flex items-end">
        <Button type="submit" size="sm" disabled={!bankCode}>
          Verify &amp; save
        </Button>
      </div>
    </form>
  );
}
