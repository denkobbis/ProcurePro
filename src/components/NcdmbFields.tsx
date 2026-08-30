const CURRENCIES = ["NGN", "USD", "EUR", "GBP"] as const;

export default function NcdmbFields({
  defaultCurrency = "NGN",
  defaultCompliant = false,
  defaultCertificateNumber = "",
  defaultCertificateExpiry = "",
  defaultLocalContentPercentage = "",
  showNcdmb = true,
}: {
  defaultCurrency?: string;
  defaultCompliant?: boolean;
  defaultCertificateNumber?: string;
  defaultCertificateExpiry?: string;
  defaultLocalContentPercentage?: string | number;
  // Currency applies to every industry; NCDMB/local-content only to oil & gas
  // and unmapped ("general") orgs — see src/lib/industries.ts.
  showNcdmb?: boolean;
}) {
  return (
    <div className="space-y-3 rounded-md border border-zinc-100 p-3 dark:border-zinc-800">
      <div>
        <label htmlFor="default-currency-field" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Default currency</label>
        <select id="default-currency-field" name="default_currency" defaultValue={defaultCurrency} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      {showNcdmb && (
        <>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" name="ncdmb_compliant" defaultChecked={defaultCompliant} className="rounded border-zinc-300 dark:border-zinc-600" />
            NCDMB / Nigerian Content compliant
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="ncdmb-certificate-number-field" className="block text-xs text-zinc-500 dark:text-zinc-400">NCDMB certificate number</label>
              <input
                id="ncdmb-certificate-number-field"
                name="ncdmb_certificate_number"
                defaultValue={defaultCertificateNumber}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label htmlFor="ncdmb-certificate-expiry-field" className="block text-xs text-zinc-500 dark:text-zinc-400">Certificate expiry</label>
              <input
                id="ncdmb-certificate-expiry-field"
                name="ncdmb_certificate_expiry"
                type="date"
                defaultValue={defaultCertificateExpiry}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>
          <div>
            <label htmlFor="local-content-percentage-field" className="block text-xs text-zinc-500 dark:text-zinc-400">Local content percentage</label>
            <input
              id="local-content-percentage-field"
              name="local_content_percentage"
              type="number"
              min="0"
              max="100"
              step="0.1"
              defaultValue={defaultLocalContentPercentage}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder="0-100"
            />
          </div>
        </>
      )}
    </div>
  );
}
