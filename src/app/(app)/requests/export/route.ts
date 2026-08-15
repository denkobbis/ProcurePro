import { getCurrentProfile, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsvGeneric, csvResponse } from "@/lib/csv";
import type { PurchaseRequest, Profile } from "@/lib/database.types";

export async function GET() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const seeAll = PROCUREMENT_ROLES.includes(profile.role);
  let query = supabase.from("requests").select("*").order("created_at", { ascending: false });
  if (!seeAll) {
    query = query.or(`requester_id.eq.${profile.id},department_id.eq.${profile.department_id}`);
  }
  const { data: requests } = await query;
  const rows = (requests ?? []) as PurchaseRequest[];

  const requesterIds = [...new Set(rows.map((r) => r.requester_id))];
  const { data: requesters } = requesterIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", requesterIds)
    : { data: [] as Pick<Profile, "id" | "full_name">[] };
  const nameMap = new Map((requesters ?? []).map((p) => [p.id, p.full_name]));

  const csv = toCsvGeneric(rows, [
    { key: "request_number", header: "Request #" },
    { key: "description", header: "Description" },
    { key: "category", header: "Category" },
    { key: "requester_id", header: "Requester", format: (v) => nameMap.get(v as string) ?? "" },
    { key: "qty", header: "Qty" },
    { key: "est_unit_cost", header: "Est. Unit Cost (NGN)" },
    { key: "urgency", header: "Urgency" },
    { key: "status", header: "Status" },
    { key: "mpn", header: "MPN" },
    { key: "oem_brand", header: "OEM Brand" },
    { key: "justification", header: "Justification" },
    { key: "created_at", header: "Created" },
  ]);

  return csvResponse(csv, "purchase-requests.csv");
}
