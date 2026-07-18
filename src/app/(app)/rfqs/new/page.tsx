import { notFound } from "next/navigation";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createRfq } from "@/app/actions/rfq";

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
      <h1 className="text-xl font-semibold text-zinc-900">Request quotes from vendors</h1>
      <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
        <p className="text-sm text-zinc-700">
          <span className="font-medium">{request.request_number}</span>: {request.description}
        </p>
        <p className="text-sm text-zinc-500">
          This creates an RFQ so you can add quotes from multiple vendors and compare before picking a winner. You can still
          convert straight to a PO instead from the request page if you already know the vendor.
        </p>
        <form action={createRfq}>
          <input type="hidden" name="request_id" value={request.id} />
          <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
            Start RFQ
          </button>
        </form>
      </div>
    </div>
  );
}
