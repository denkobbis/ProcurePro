import { notFound } from "next/navigation";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateVendorApproval, updateVendorCompliance, updatePerformanceNotes, uploadVendorDocument } from "@/app/actions/vendors";
import NcdmbFields from "@/components/NcdmbFields";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/Button";
import type { VendorDocument } from "@/lib/database.types";

function expiryBadge(expiryDate?: string | null) {
  if (!expiryDate) return null;
  const daysLeft = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (daysLeft < 0) return <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Expired</span>;
  if (daysLeft <= 60) return <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Expires in {daysLeft}d</span>;
  return null;
}

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  const supabase = await createClient();
  const { data: vendor } = await supabase.from("vendors").select("*").eq("id", id).single();
  if (!vendor) notFound();

  const documents = (vendor.documents ?? []) as VendorDocument[];
  const documentUrls = new Map<string, string>();
  for (const d of documents) {
    const { data } = await supabase.storage.from("attachments").createSignedUrl(d.file_path, 3600);
    if (data) documentUrls.set(d.file_path, data.signedUrl);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title={vendor.name} description={vendor.category ?? "No category set"} />

      <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Contact email</dt>
            <dd className="text-zinc-900">{vendor.contact_email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Contact phone</dt>
            <dd className="text-zinc-900">{vendor.contact_phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Payment terms</dt>
            <dd className="text-zinc-900">{vendor.payment_terms ?? "—"}</dd>
          </div>
        </dl>

        <form action={updateVendorApproval} className="flex items-center gap-2">
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <input type="checkbox" name="is_approved" defaultChecked={vendor.is_approved} className="rounded border-zinc-300" />
          <label className="text-sm text-zinc-700">Approved for use on purchase orders</label>
          <Button type="submit" variant="secondary" size="sm" className="ml-auto">Save</Button>
        </form>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">Currency &amp; Nigerian Content compliance</h2>
        <form action={updateVendorCompliance} className="space-y-3">
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <NcdmbFields
            defaultCurrency={vendor.default_currency}
            defaultCompliant={vendor.ncdmb_compliant}
            defaultCertificateNumber={vendor.ncdmb_certificate_number ?? ""}
            defaultCertificateExpiry={vendor.ncdmb_certificate_expiry ?? ""}
            defaultLocalContentPercentage={vendor.local_content_percentage ?? ""}
          />
          {expiryBadge(vendor.ncdmb_certificate_expiry) && (
            <p className="text-sm text-zinc-600">NCDMB certificate {expiryBadge(vendor.ncdmb_certificate_expiry)}</p>
          )}
          <Button type="submit" size="sm">Save</Button>
        </form>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">Performance notes</h2>
        <form action={updatePerformanceNotes} className="space-y-2">
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <textarea
            name="performance_notes"
            rows={3}
            defaultValue={vendor.performance_notes ?? ""}
            placeholder="e.g. Late delivery on PO#123, otherwise reliable"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <Button type="submit" size="sm">Save notes</Button>
        </form>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">Documents</h2>
        <ul className="mb-3 space-y-1 text-sm">
          {documents.map((d) => (
            <li key={d.file_path} className="text-zinc-700">
              {documentUrls.has(d.file_path) ? (
                <a href={documentUrls.get(d.file_path)} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
                  {d.document_type ? `${d.document_type} — ${d.file_name}` : d.file_name}
                </a>
              ) : (
                d.document_type ? `${d.document_type} — ${d.file_name}` : d.file_name
              )}
              {expiryBadge(d.expiry_date)}
            </li>
          ))}
          {documents.length === 0 && <li className="text-zinc-400">No documents uploaded (e.g. CAC certificate, tax ID, insurance).</li>}
        </ul>
        <form action={uploadVendorDocument} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <input name="document_type" placeholder="Type (e.g. CAC Certificate)" className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:col-span-2" />
          <input name="expiry_date" type="date" title="Expiry date (optional)" className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          <input type="file" name="document" className="text-sm" />
          <Button type="submit" variant="secondary" size="sm" className="sm:col-span-4">Upload</Button>
        </form>
      </div>
    </div>
  );
}
