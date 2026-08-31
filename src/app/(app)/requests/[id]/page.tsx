import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";
import { Button, ButtonLink } from "@/components/Button";
import { submitRequest, addRequestComment, addRequestAttachment } from "@/app/actions/requests";
import { RecordHeader, Stepper, RecordSection, FactsPanel, NotePanel, TimelineList, type StepDef } from "@/components/RecordPanels";
import type { Approval, RequestComment, RequestAttachment, Profile, Vendor, PurchaseOrder, RequestStatus } from "@/lib/database.types";

function stepperFor(status: RequestStatus, po: PurchaseOrder | null): StepDef[] {
  const labels = ["Submitted", "Approved", "Purchase order", "Received"];
  let index = -1;
  if (status === "draft") index = -1;
  else if (status === "submitted" || status === "under_review") index = 0;
  else if (status === "approved") index = 1;
  else if (status === "converted_to_po") index = po && ["fully_received", "closed"].includes(po.status) ? 3 : 2;
  return labels.map((label, i) => ({
    label,
    state: i <= index ? "done" : i === index + 1 && status !== "rejected" && status !== "draft" ? "current" : "todo",
  }));
}

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

  const [{ data: approvals }, { data: comments }, { data: attachments }, { data: requester }, { data: vendor }, { data: department }, { data: po }] =
    await Promise.all([
      supabase.from("approvals").select("*").eq("request_id", id).order("step_order"),
      supabase.from("request_comments").select("*").eq("request_id", id).order("created_at"),
      supabase.from("request_attachments").select("*").eq("request_id", id).order("created_at"),
      supabase.from("profiles").select("*").eq("id", request.requester_id).single(),
      request.vendor_id ? supabase.from("vendors").select("*").eq("id", request.vendor_id).single() : Promise.resolve({ data: null }),
      supabase.from("departments").select("*").eq("id", request.department_id).single(),
      supabase.from("purchase_orders").select("*").eq("request_id", id).maybeSingle(),
    ]);

  const commentAuthorIds = [...new Set((comments ?? []).map((c: RequestComment) => c.author_id))];
  const { data: authors } = commentAuthorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", commentAuthorIds)
    : { data: [] as Pick<Profile, "id" | "full_name">[] };
  const authorMap = new Map((authors ?? []).map((a) => [a.id, a.full_name]));

  const attachmentList = (attachments ?? []) as RequestAttachment[];
  const attachmentUrls = new Map<string, string>();
  for (const a of attachmentList) {
    // Forces Content-Disposition: attachment regardless of the uploaded
    // file's actual content-type — an uploaded .html/.svg opened inline
    // instead of downloaded would execute as a page in the storage
    // origin. File-type validation at upload time couldn't fully close
    // this either, since the browser-reported MIME type isn't trustworthy
    // against a hand-crafted upload; forcing download is the fix that
    // doesn't depend on trusting it.
    const { data } = await supabase.storage.from("attachments").createSignedUrl(a.file_path, 3600, { download: a.file_name });
    if (data) attachmentUrls.set(a.id, data.signedUrl);
  }

  const canSubmit = request.status === "draft" && request.requester_id === profile.id;
  const canConvertToPo = request.status === "approved" && PROCUREMENT_ROLES.includes(profile.role);
  const total = request.qty * request.est_unit_cost;

  return (
    <div className="max-w-4xl space-y-4">
      <RecordHeader
        backHref="/requests"
        backLabel="Back to requests"
        title={request.request_number}
        subline={(department as { name?: string } | null)?.name}
        badges={<StatusBadge status={request.status} />}
        actions={
          <>
            {canSubmit && (
              <form action={submitRequest}>
                <input type="hidden" name="request_id" value={request.id} />
                <Button type="submit" size="sm">Submit for approval</Button>
              </form>
            )}
            {canConvertToPo && (
              <>
                <Link
                  href={`/purchase-orders/new?request_id=${request.id}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-green-700 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1"
                >
                  Convert to purchase order
                </Link>
                <ButtonLink href={`/rfqs/new?request_id=${request.id}`} variant="secondary" size="sm">
                  Get quotes first (RFQ)
                </ButtonLink>
              </>
            )}
          </>
        }
      />

      {request.status !== "rejected" && <Stepper steps={stepperFor(request.status, (po as PurchaseOrder | null) ?? null)} />}

      {warning === "over_budget" && (
        <NotePanel tone="warn">
          This request exceeds the remaining budget for its category. It was still submitted (soft warning) — Finance/Admin can review it
          on the <Link href="/budgets" className="underline">Budgets</Link> page.
        </NotePanel>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <RecordSection title="Request details">
            <FactsPanel
              facts={[
                { label: "Description", value: request.description, full: true },
                { label: "Category", value: request.category },
                { label: "Urgency", value: <span className="capitalize">{request.urgency}</span> },
                { label: "Quantity", value: request.qty },
                { label: "Est. unit cost", value: formatNaira(request.est_unit_cost) },
                { label: "Total estimated", value: formatNaira(total) },
                { label: "Requester", value: (requester as Profile | null)?.full_name ?? "—" },
                ...(vendor ? [{ label: "Preferred vendor", value: (vendor as Vendor).name }] : []),
                ...(request.mpn ? [{ label: "Manufacturer part number", value: request.mpn }] : []),
                ...(request.oem_brand ? [{ label: "OEM brand", value: request.oem_brand }] : []),
                ...(request.justification ? [{ label: "Justification", value: request.justification, full: true }] : []),
              ]}
            />
          </RecordSection>

          <RecordSection title="Attachments">
            <ul className="mb-3 space-y-1 text-sm">
              {attachmentList.map((a) => (
                <li key={a.id} className="text-zinc-700 dark:text-zinc-300">
                  {attachmentUrls.has(a.id) ? (
                    <a href={attachmentUrls.get(a.id)} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline dark:text-brand-400">
                      {a.file_name}
                    </a>
                  ) : (
                    a.file_name
                  )}
                </li>
              ))}
              {attachmentList.length === 0 && <li className="text-zinc-400 dark:text-zinc-500">No attachments.</li>}
            </ul>
            <form action={addRequestAttachment} className="flex items-center gap-2">
              <input type="hidden" name="request_id" value={request.id} />
              <input type="file" name="attachment" className="text-sm" />
              <Button type="submit" variant="secondary" size="sm">Upload</Button>
            </form>
          </RecordSection>

          <RecordSection title="Comments">
            <ul className="mb-4 space-y-3">
              {(comments ?? []).map((c: RequestComment) => (
                <li key={c.id} className="text-sm">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{authorMap.get(c.author_id) ?? "—"}</span>{" "}
                  <span className="text-zinc-400 dark:text-zinc-500">{new Date(c.created_at).toLocaleString()}</span>
                  <p className="text-zinc-700 dark:text-zinc-300">{c.comment}</p>
                </li>
              ))}
              {(comments ?? []).length === 0 && <li className="text-sm text-zinc-400 dark:text-zinc-500">No comments yet.</li>}
            </ul>
            <form action={addRequestComment} className="flex gap-2">
              <input type="hidden" name="request_id" value={request.id} />
              <input name="comment" required placeholder="Add a comment" className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
              <Button type="submit" size="sm">Post</Button>
            </form>
          </RecordSection>
        </div>

        <div className="space-y-4">
          <RecordSection title="Approval trail">
            <TimelineList
              items={(approvals ?? []).map((a: Approval) => ({
                title: (
                  <span className="flex items-center gap-2">
                    Step {a.step_order} — {a.approver_role.replace(/_/g, " ")}
                    <StatusBadge status={a.status} />
                  </span>
                ),
                meta: a.comment ? `“${a.comment}”` : undefined,
                when: a.acted_at ? new Date(a.acted_at).toLocaleDateString() : undefined,
              }))}
            />
          </RecordSection>
        </div>
      </div>
    </div>
  );
}
