import { notFound } from "next/navigation";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateVendorApproval, updatePerformanceNotes, uploadVendorDocument } from "@/app/actions/vendors";

interface VendorDocument {
  file_path: string;
  file_name: string;
  uploaded_at: string;
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
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">{vendor.name}</h1>
        <p className="text-sm text-zinc-500">{vendor.category ?? "No category set"}</p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
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
          <button className="ml-auto rounded-md border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50">Save</button>
        </form>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-2 font-medium text-zinc-900">Performance notes</h2>
        <form action={updatePerformanceNotes} className="space-y-2">
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <textarea
            name="performance_notes"
            rows={3}
            defaultValue={vendor.performance_notes ?? ""}
            placeholder="e.g. Late delivery on PO#123, otherwise reliable"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <button className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800">Save notes</button>
        </form>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-2 font-medium text-zinc-900">Documents</h2>
        <ul className="mb-3 space-y-1 text-sm">
          {documents.map((d) => (
            <li key={d.file_path} className="text-zinc-700">
              {documentUrls.has(d.file_path) ? (
                <a href={documentUrls.get(d.file_path)} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
                  {d.file_name}
                </a>
              ) : (
                d.file_name
              )}
            </li>
          ))}
          {documents.length === 0 && <li className="text-zinc-400">No documents uploaded (e.g. CAC certificate, tax ID).</li>}
        </ul>
        <form action={uploadVendorDocument} className="flex items-center gap-2">
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <input type="file" name="document" className="text-sm" />
          <button className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">Upload</button>
        </form>
      </div>
    </div>
  );
}
