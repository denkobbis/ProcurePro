const CURRENCIES = ["NGN", "USD", "EUR", "GBP"] as const;

export default function CurrencyFields({
  defaultCurrency = "NGN",
  defaultFxRate = 1,
  defaultFreightCost = 0,
  defaultCustomsDuty = 0,
}: {
  defaultCurrency?: string;
  defaultFxRate?: number;
  defaultFreightCost?: number;
  defaultCustomsDuty?: number;
}) {
  return (
    <div className="space-y-3 rounded-md border border-zinc-100 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-zinc-500">Currency</label>
          <select name="currency" defaultValue={defaultCurrency} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-500">FX rate to ₦ (1 unit = ? NGN)</label>
          <input
            name="fx_rate_to_ngn"
            type="number"
            step="0.000001"
            min="0"
            defaultValue={defaultFxRate}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-zinc-500">Freight cost (₦)</label>
          <input
            name="freight_cost_ngn"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultFreightCost}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500">Customs duty (₦)</label>
          <input
            name="customs_duty_ngn"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultCustomsDuty}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <p className="text-xs text-zinc-400">
        Freight and customs duty are entered in Naira (what you actually pay locally), regardless of the PO&apos;s own currency.
      </p>
    </div>
  );
}
