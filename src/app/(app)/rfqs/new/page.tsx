import { notFound } from "next/navigation";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createRfq } from "@/app/actions/rfq";
import { formatNaira } from "@/lib/money";
import { Button } from "@/components/Button";
import { FormShell, FormPanel, AsidePanel } from "@/components/FormLayout";

export default async function NewRfqPage({
  searchParams,
}: {
  searchParams: Promise<{ request_id?: string }>;
}) {
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  const { request_id: requestId } = await searchParams;
  if (!requestId) notFound();

  const supabase = await createClient();
  const { data: request } = await supabase.from("requests").select("*").eq("id", requestId).single();
  if (!request || request.status !== "approved") notFound();

  return (
    <FormShell
      backHref={`/requests/${request.id}`}
      backLabel="Back to request"
      title="Request quotes from vendors"
      form={
        <FormPanel title={request.request_number} note={request.description}>
          <div className="col-span-12">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              This creates an RFQ so you can add quotes from multiple vendors and compare before picking a winner. You can still
              convert straight to a PO instead from the request page if you already know the vendor.
            </p>
            <form action={createRfq} className="mt-4">
              <input type="hidden" name="request_id" value={request.id} />
              <Button type="submit">Start RFQ</Button>
            </form>
          </div>
        </FormPanel>
      }
      aside={
        <AsidePanel title="This request">
          <dl className="space-y-1.5 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Quantity</dt>
              <dd className="tabular-nums text-zinc-900 dark:text-zinc-100">{request.qty}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Est. unit cost</dt>
              <dd className="tabular-nums text-zinc-900 dark:text-zinc-100">{formatNaira(request.est_unit_cost)}</dd>
            </div>
            <div className="flex justify-between border-t border-zinc-100 pt-1.5 font-medium dark:border-zinc-800">
              <dt className="text-zinc-700 dark:text-zinc-300">Est. total</dt>
              <dd className="tabular-nums text-zinc-900 dark:text-zinc-100">{formatNaira(request.qty * request.est_unit_cost)}</dd>
            </div>
          </dl>
        </AsidePanel>
      }
    />
  );
}
