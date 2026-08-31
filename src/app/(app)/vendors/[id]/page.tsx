import { notFound } from "next/navigation";
import { getCurrentProfile, getCurrentOrganization, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateVendorApproval, updateVendorCompliance, updatePerformanceNotes, uploadVendorDocument } from "@/app/actions/vendors";
import NcdmbFields from "@/components/NcdmbFields";
import { Button } from "@/components/Button";
import VendorPayoutForm from "@/components/VendorPayoutForm";
import { listBanks } from "@/lib/paystack";
import { getIndustryModules } from "@/lib/industries";
import { getVendorScorecard } from "@/lib/vendor-score";
import { findVendorsSharingAccount } from "@/lib/vendor-fraud";
import { evaluateVendorCompliance, type ComplianceVerdict } from "@/lib/ncdmb-compliance";
import { RecordHeader, RecordSection, FactsPanel, NotePanel, StatsRow } from "@/components/RecordPanels";
import type { VendorDocument, NcdmbComplianceRule } from "@/lib/database.types";

const VERDICT_LABEL: Record<ComplianceVerdict, string> = {
  compliant: "Compliant",
  at_risk: "At risk",
  non_compliant: "Non-compliant",
  not_rated: "Not rated",
};

const VERDICT_CLASS: Record<ComplianceVerdict, string> = {
  compliant: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  at_risk: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  non_compliant: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  not_rated: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

function pct(n: number | null) {
  return n == null ? "—" : `${Math.round(n * 100)}%`;
}

function expiryBadge(expiryDate?: string | null) {
  if (!expiryDate) return null;
  const daysLeft = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (daysLeft < 0) return <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">Expired</span>;
  if (daysLeft <= 60) return <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">Expires in {daysLeft}d</span>;
  return null;
}

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);
  const org = await getCurrentOrganization(profile);
  const modules = getIndustryModules(org.industry);

  const supabase = await createClient();
  const { data: vendor } = await supabase.from("vendors").select("*").eq("id", id).single();
  if (!vendor) notFound();

  const documents = (vendor.documents ?? []) as VendorDocument[];
  const documentUrls = new Map<string, string>();
  if (documents.length > 0) {
    // Forces Content-Disposition: attachment — see the identical note on
    // the request-attachments signed URL in requests/[id]/page.tsx.
    const { data } = await supabase.storage.from("attachments").createSignedUrls(documents.map((d) => d.file_path), 3600, { download: true });
    for (const row of data ?? []) {
      if (row.path && row.signedUrl) documentUrls.set(row.path, row.signedUrl);
    }
  }

  const scorecard = await getVendorScorecard(supabase, vendor.id);
  const sharedAccountVendors = vendor.account_number ? await findVendorsSharingAccount(supabase, vendor.account_number, vendor.id) : [];

  let compliance: ReturnType<typeof evaluateVendorCompliance> | null = null;
  if (modules.ncdmb) {
    const { data: rulesData } = await supabase.from("ncdmb_compliance_rules").select("*");
    compliance = evaluateVendorCompliance(vendor, (rulesData ?? []) as NcdmbComplianceRule[]);
  }

  let banks: { name: string; code: string }[] = [];
  let banksError: string | null = null;
  try {
    banks = await listBanks();
  } catch (err) {
    banksError = err instanceof Error ? err.message : "Could not load bank list";
  }

  return (
    <div className="max-w-3xl space-y-4">
      <RecordHeader
        backHref="/vendors"
        backLabel="Back to vendors"
        title={vendor.name}
        subline={vendor.category ?? "No category set"}
        badges={
          <>
            {vendor.is_approved ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">Approved</span>
            ) : (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">Pending</span>
            )}
            {vendor.ncdmb_compliant && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">NCDMB</span>}
          </>
        }
      />

      {sharedAccountVendors.length > 0 && (
        <NotePanel tone="warn" title="Shared bank account">
          This account number is also on file for {sharedAccountVendors.map((v) => v.name).join(", ")} — a known payment-diversion pattern
          (same account, different company name). Worth confirming this is intentional before paying either vendor.
        </NotePanel>
      )}

      <RecordSection title="Reliability scorecard">
        {scorecard.quoteCount === 0 && scorecard.poCount === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">No quote or order history yet — the scorecard fills in as this vendor is used.</p>
        ) : (
          <StatsRow
            stats={[
              { label: "Avg. quote response", value: scorecard.avgResponseDays == null ? "—" : `${scorecard.avgResponseDays}d` },
              { label: "Quotes given", value: String(scorecard.quoteCount) },
              { label: "Orders fully received", value: pct(scorecard.fullyReceivedRate) },
              { label: "Fulfillment rate", value: pct(scorecard.fulfillmentRate) },
            ]}
          />
        )}
      </RecordSection>

      <RecordSection title="Contact & terms">
        <FactsPanel
          facts={[
            { label: "Contact email", value: vendor.contact_email ?? "—" },
            { label: "Contact phone", value: vendor.contact_phone ?? "—" },
            { label: "Payment terms", value: vendor.payment_terms ?? "—" },
          ]}
        />
        <form action={updateVendorApproval} className="mt-3 flex items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <input type="checkbox" name="is_approved" defaultChecked={vendor.is_approved} className="rounded border-zinc-300 dark:border-zinc-600" />
          <label className="text-sm text-zinc-700 dark:text-zinc-300">Approved for use on purchase orders</label>
          <Button type="submit" variant="secondary" size="sm" className="ml-auto">Save</Button>
        </form>
      </RecordSection>

      <RecordSection title={modules.ncdmb ? "Currency & Nigerian Content compliance" : "Currency"}>
        <form action={updateVendorCompliance} className="space-y-3">
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <NcdmbFields
            defaultCurrency={vendor.default_currency}
            defaultCompliant={vendor.ncdmb_compliant}
            defaultCertificateNumber={vendor.ncdmb_certificate_number ?? ""}
            defaultCertificateExpiry={vendor.ncdmb_certificate_expiry ?? ""}
            defaultLocalContentPercentage={vendor.local_content_percentage ?? ""}
            showNcdmb={modules.ncdmb}
          />
          {modules.ncdmb && expiryBadge(vendor.ncdmb_certificate_expiry) && (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">NCDMB certificate {expiryBadge(vendor.ncdmb_certificate_expiry)}</p>
          )}
          <Button type="submit" size="sm">Save</Button>
        </form>
      </RecordSection>

      {compliance && (
        <RecordSection title="Compliance status">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${VERDICT_CLASS[compliance.verdict]}`}>{VERDICT_LABEL[compliance.verdict]}</span>
            {compliance.rule && <span className="text-sm text-zinc-500 dark:text-zinc-400">against the &ldquo;{compliance.rule.category}&rdquo; rule</span>}
          </div>
          <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
            {compliance.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          {!compliance.rule && (
            <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
              Set a rule for the &ldquo;{vendor.category ?? "(no category)"}&rdquo; category on the{" "}
              <a href="/compliance" className="text-brand-600 hover:underline dark:text-brand-400">
                Compliance
              </a>{" "}
              page to rate this vendor.
            </p>
          )}
        </RecordSection>
      )}

      <RecordSection title="Performance notes">
        <form action={updatePerformanceNotes} className="space-y-2">
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <textarea
            name="performance_notes"
            rows={3}
            defaultValue={vendor.performance_notes ?? ""}
            placeholder="e.g. Late delivery on PO#123, otherwise reliable"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <Button type="submit" size="sm">Save notes</Button>
        </form>
      </RecordSection>

      <RecordSection title="Payout details">
        {vendor.account_number ? (
          <p className="mb-3 text-sm text-zinc-700 dark:text-zinc-300">
            {vendor.bank_name} — {vendor.account_number} ({vendor.account_name})
            {vendor.paystack_recipient_code && <span className="ml-2 text-xs text-green-700 dark:text-green-400">Paystack verified</span>}
          </p>
        ) : (
          <p className="mb-3 text-sm text-zinc-400 dark:text-zinc-500">No payout details on file — a payment can&apos;t be initiated until these are set.</p>
        )}
        {banksError ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Payouts aren&apos;t configured yet ({banksError === "PAYSTACK_SECRET_KEY is not configured" ? "PAYSTACK_SECRET_KEY is not set" : banksError}).
          </p>
        ) : (
          <VendorPayoutForm vendorId={vendor.id} banks={banks} />
        )}
      </RecordSection>

      <RecordSection title="Documents">
        <ul className="mb-3 space-y-1 text-sm">
          {documents.map((d) => (
            <li key={d.file_path} className="text-zinc-700 dark:text-zinc-300">
              {documentUrls.has(d.file_path) ? (
                <a href={documentUrls.get(d.file_path)} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline dark:text-brand-400">
                  {d.document_type ? `${d.document_type} — ${d.file_name}` : d.file_name}
                </a>
              ) : d.document_type ? (
                `${d.document_type} — ${d.file_name}`
              ) : (
                d.file_name
              )}
              {expiryBadge(d.expiry_date)}
            </li>
          ))}
          {documents.length === 0 && <li className="text-zinc-400 dark:text-zinc-500">No documents uploaded (e.g. CAC certificate, tax ID, insurance).</li>}
        </ul>
        <form action={uploadVendorDocument} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <input name="document_type" placeholder="Type (e.g. CAC Certificate)" className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
          <input name="expiry_date" type="date" title="Expiry date (optional)" className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
          <input type="file" name="document" className="text-sm" />
          <Button type="submit" variant="secondary" size="sm" className="sm:col-span-4">Upload</Button>
        </form>
      </RecordSection>
    </div>
  );
}
