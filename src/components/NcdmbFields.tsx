const CURRENCIES = ["NGN", "USD", "EUR", "GBP"] as const;

export default function NcdmbFields({
  defaultCurrency = "NGN",
  defaultCompliant = false,
  defaultCertificateNumber = "",
  defaultCertificateExpiry = "",
  defaultLocalContentPercentage = "",
}: {
  defaultCurrency?: string;
  defaultCompliant?: boolean;
  defaultCertificateNumber?: string;
  defaultCertificateExpiry?: string;
  defaultLocalContentPercentage?: string | number;
}) {
  return (
    <div className="space-y-3 rounded-md border border-zinc-100 p-3">
      <div>
        <label className="block text-sm font-medium text-zinc-700">Default currency</label>
        <select name="default_currency" defaultValue={defaultCurrency} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input type="checkbox" name="ncdmb_compliant" defaultChecked={defaultCompliant} className="rounded border-zinc-300" />
        NCDMB / Nigerian Content compliant
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-zinc-500">NCDMB certificate number</label>
          <input
            name="ncdmb_certificate_number"
            defaultValue={defaultCertificateNumber}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500">Certificate expiry</label>
          <input
            name="ncdmb_certificate_expiry"
            type="date"
            defaultValue={defaultCertificateExpiry}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-zinc-500">Local content percentage</label>
        <input
          name="local_content_percentage"
          type="number"
          min="0"
          max="100"
          step="0.1"
          defaultValue={defaultLocalContentPercentage}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          placeholder="0-100"
        />
      </div>
    </div>
  );
}
