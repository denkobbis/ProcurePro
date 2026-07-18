import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";
import { submitRequest, addRequestComment, addRequestAttachment } from "@/app/actions/requests";
import type { Approval, RequestComment, RequestAttachment, Profile, Vendor } from "@/lib/database.types";

export default async function RequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ warning?: string }>;
}) {
  const { id } = await params;
  const { warning } = await searchParams;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: request } = await supabase.from("requests").select("*").eq("id", id).single();
  if (!request) notFound();

  const [{ data: approvals }, { data: comments }, { data: attachments }, { data: requester }, { data: vendor }, { data: department }] =
    await Promise.all([
      supabase.from("approvals").select("*").eq("request_id", id).order("step_order"),
      supabase.from("request_comments").select("*").eq("request_id", id).order("created_at"),
      supabase.from("request_attachments").select("*").eq("request_id", id).order("created_at"),
      supabase.from("profiles").select("*").eq("id", request.requester_id).single(),
      request.vendor_id ? supabase.from("vendors").select("*").eq("id", request.vendor_id).single() : Promise.resolve({ data: null }),
      supabase.from("departments").select("*").eq("id", request.department_id).single(),
    ]);

  const commentAuthorIds = [...new Set((comments ?? []).map((c: RequestComment) => c.author_id))];
  const { data: authors } = commentAuthorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", commentAuthorIds)
    : { data: [] as Pick<Profile, "id" | "full_name">[] };
  const authorMap = new Map((authors ?? []).map((a) => [a.id, a.full_name]));

  const attachmentList = (attachments ?? []) as RequestAttachment[];
  const attachmentUrls = new Map<string, string>();
  for (const a of attachmentList) {
    const { data } = await supabase.storage.from("attachments").createSignedUrl(a.file_path, 3600);
    if (data) attachmentUrls.set(a.id, data.signedUrl);
  }

  const canSubmit = request.status === "draft" && request.requester_id === profile.id;
  const canConvertToPo = request.status === "approved" && PROCUREMENT_ROLES.includes(profile.role);
  const total = request.qty * request.est_unit_cost;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{request.request_number}</h1>
          <p className="text-sm text-zinc-500">{(department as { name?: string } | null)?.name}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {warning === "over_budget" && (
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This request exceeds the remaining budget for its category. It was still submitted (soft warning) — Finance/Admin
          can review it on the <Link href="/budgets" className="underline">Budgets</Link> page.
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">Description</dt>
            <dd className="text-zinc-900">{request.description}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Category</dt>
            <dd className="text-zinc-900">{request.category}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Urgency</dt>
            <dd className="text-zinc-900 capitalize">{request.urgency}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Quantity</dt>
            <dd className="text-zinc-900">{request.qty}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Est. unit cost</dt>
            <dd className="text-zinc-900">{formatNaira(request.est_unit_cost)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Total estimated</dt>
            <dd className="font-medium text-zinc-900">{formatNaira(total)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Requester</dt>
            <dd className="text-zinc-900">{(requester as Profile | null)?.full_name}</dd>
          </div>
          {vendor && (
            <div>
              <dt className="text-zinc-500">Preferred vendor</dt>
              <dd className="text-zinc-900">{(vendor as Vendor).name}</dd>
            </div>
          )}
          {request.mpn && (
            <div>
              <dt className="text-zinc-500">Manufacturer part number</dt>
              <dd className="text-zinc-900">{request.mpn}</dd>
            </div>
          )}
          {request.oem_brand && (
            <div>
              <dt className="text-zinc-500">OEM brand</dt>
              <dd className="text-zinc-900">{request.oem_brand}</dd>
            </div>
          )}
          {request.justification && (
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Justification</dt>
              <dd className="text-zinc-900">{request.justification}</dd>
            </div>
          )}
        </dl>

        <div className="mt-4 flex gap-2">
          {canSubmit && (
            <form action={submitRequest}>
              <input type="hidden" name="request_id" value={request.id} />
              <button className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800">
                Submit for approval
              </button>
            </form>
          )}
          {canConvertToPo && (
            <>
              <Link
                href={`/purchase-orders/new?request_id=${request.id}`}
                className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800"
              >
                Convert to Purchase Order
              </Link>
              <Link
                href={`/rfqs/new?request_id=${request.id}`}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Get quotes first (RFQ)
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-3 font-medium text-zinc-900">Approval trail</h2>
        {(approvals ?? []).length === 0 && <p className="text-sm text-zinc-400">Not submitted yet.</p>}
        <ol className="space-y-2">
          {(approvals ?? []).map((a: Approval) => (
            <li key={a.id} className="flex items-center justify-between rounded-md border border-zinc-100 px-3 py-2 text-sm">
              <span className="text-zinc-700">
                Step {a.step_order} — {a.approver_role.replace(/_/g, " ")}
                {a.comment && <span className="ml-2 text-zinc-400">&ldquo;{a.comment}&rdquo;</span>}
              </span>
              <StatusBadge status={a.status} />
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-3 font-medium text-zinc-900">Attachments</h2>
        <ul className="mb-3 space-y-1 text-sm">
          {attachmentList.map((a) => (
            <li key={a.id} className="text-zinc-700">
              {attachmentUrls.has(a.id) ? (
                <a href={attachmentUrls.get(a.id)} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
                  {a.file_name}
                </a>
              ) : (
                a.file_name
              )}
            </li>
          ))}
          {attachmentList.length === 0 && <li className="text-zinc-400">No attachments.</li>}
        </ul>
        <form action={addRequestAttachment} className="flex items-center gap-2">
          <input type="hidden" name="request_id" value={request.id} />
          <input type="file" name="attachment" className="text-sm" />
          <button className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">Upload</button>
        </form>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-3 font-medium text-zinc-900">Comments</h2>
        <ul className="mb-4 space-y-3">
          {(comments ?? []).map((c: RequestComment) => (
            <li key={c.id} className="text-sm">
              <span className="font-medium text-zinc-900">{authorMap.get(c.author_id) ?? "—"}</span>{" "}
              <span className="text-zinc-400">{new Date(c.created_at).toLocaleString()}</span>
              <p className="text-zinc-700">{c.comment}</p>
            </li>
          ))}
          {(comments ?? []).length === 0 && <li className="text-sm text-zinc-400">No comments yet.</li>}
        </ul>
        <form action={addRequestComment} className="flex gap-2">
          <input type="hidden" name="request_id" value={request.id} />
          <input name="comment" required placeholder="Add a comment" className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm" />
          <button className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800">Post</button>
        </form>
      </div>
    </div>
  );
}
