"use client";

import { useState } from "react";
import { submitDemoRequest, type SubmitDemoRequestResult } from "@/app/actions/leads";
import { Button, ButtonLink } from "@/components/Button";
import { CheckCircleIcon } from "@/components/icons";

const inputClass =
  "mt-1.5 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";
const labelClass = "block text-sm font-medium text-zinc-700";

export function DemoRequestForm({
  utmSource,
  utmMedium,
  utmCampaign,
}: {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}) {
  const [result, setResult] = useState<SubmitDemoRequestResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const form = e.currentTarget;
    const next = await submitDemoRequest(new FormData(form));
    setResult(next);
    setSubmitting(false);
    if (next.ok) form.reset();
  }

  if (result?.ok) {
    return (
      <div className="flex h-full min-h-[440px] flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-10 text-center">
        <CheckCircleIcon className="h-10 w-10 text-green-600" />
        <h3 className="mt-4 text-lg font-semibold tracking-tight text-zinc-900">Request received.</h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
          We&rsquo;ll come back to you within one business day to set up a walkthrough against your own purchasing
          workflow. If you don&rsquo;t want to wait, the trial is ready now.
        </p>
        <ButtonLink href="/signup" variant="accent" size="lg" className="mt-6">
          Start 14-day free trial
        </ButtonLink>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-zinc-200 bg-white p-6 shadow-lg shadow-black/20 sm:p-8"
      noValidate
    >
      {result && !result.ok && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{result.error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lead-name" className={labelClass}>
            Your name
          </label>
          <input id="lead-name" name="name" type="text" autoComplete="name" required maxLength={120} className={inputClass} placeholder="Jane Doe" />
        </div>
        <div>
          <label htmlFor="lead-company" className={labelClass}>
            Company
          </label>
          <input id="lead-company" name="company" type="text" autoComplete="organization" required maxLength={120} className={inputClass} placeholder="Acme Resources Ltd" />
        </div>
        <div>
          <label htmlFor="lead-email" className={labelClass}>
            Work email
          </label>
          <input id="lead-email" name="email" type="email" autoComplete="email" required maxLength={200} className={inputClass} placeholder="you@company.com" />
        </div>
        <div>
          <label htmlFor="lead-phone" className={labelClass}>
            Phone <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <input id="lead-phone" name="phone" type="tel" autoComplete="tel" maxLength={40} className={inputClass} placeholder="+234 ..." />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="lead-message" className={labelClass}>
          How does procurement run at your company today? <span className="font-normal text-zinc-400">(optional)</span>
        </label>
        <textarea
          id="lead-message"
          name="message"
          rows={3}
          maxLength={1000}
          className={`${inputClass} resize-none`}
          placeholder="e.g. Approvals over WhatsApp, POs in a shared spreadsheet, NCDMB tracking manual..."
        />
      </div>

      {/* Honeypot field — invisible to humans, filled by bots. */}
      <input aria-hidden="true" tabIndex={-1} autoComplete="off" name="company_website" className="sr-only" value="" onChange={() => {}} />

      <input type="hidden" name="utm_source" value={utmSource ?? ""} />
      <input type="hidden" name="utm_medium" value={utmMedium ?? ""} />
      <input type="hidden" name="utm_campaign" value={utmCampaign ?? ""} />

      <Button type="submit" variant="accent" size="lg" className="mt-6 w-full justify-center" disabled={submitting}>
        {submitting ? "Sending..." : "Request a walkthrough"}
      </Button>
      <p className="mt-3 text-center text-xs text-zinc-400">
        Prefer to just try it? The free trial needs no card.
      </p>
    </form>
  );
}