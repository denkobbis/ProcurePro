import MoneyInput from "./MoneyInput";

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
    <div className="space-y-3 rounded-md border border-zinc-100 p-3 dark:border-zinc-800">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-zinc-500 dark:text-zinc-400">Currency</label>
          <select name="currency" defaultValue={defaultCurrency} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 dark:text-zinc-400">FX rate to ₦ (1 unit = ? NGN)</label>
          <input
            name="fx_rate_to_ngn"
            type="number"
            step="0.000001"
            min="0"
            defaultValue={defaultFxRate}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-zinc-500 dark:text-zinc-400">Freight cost (₦)</label>
          <MoneyInput
            name="freight_cost_ngn"
            defaultValue={defaultFreightCost}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 dark:text-zinc-400">Customs duty (₦)</label>
          <MoneyInput
            name="customs_duty_ngn"
            defaultValue={defaultCustomsDuty}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        Freight and customs duty are entered in Naira (what you actually pay locally), regardless of the PO&apos;s own currency.
      </p>
    </div>
  );
}
