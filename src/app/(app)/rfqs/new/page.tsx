import { notFound } from "next/navigation";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createRfq } from "@/app/actions/rfq";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/Button";

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
    <div className="max-w-xl space-y-4">
      <PageHeader title="Request quotes from vendors" />
      <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-zinc-700">
          <span className="font-medium">{request.request_number}</span>: {request.description}
        </p>
        <p className="text-sm text-zinc-500">
          This creates an RFQ so you can add quotes from multiple vendors and compare before picking a winner. You can still
          convert straight to a PO instead from the request page if you already know the vendor.
        </p>
        <form action={createRfq}>
          <input type="hidden" name="request_id" value={request.id} />
          <Button type="submit">Start RFQ</Button>
        </form>
      </div>
    </div>
  );
}
