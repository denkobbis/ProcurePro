import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile, requireActiveOrg, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { allowAiCall } from "@/lib/ai-usage";
import { extractInvoiceFields } from "@/lib/extract";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!PROCUREMENT_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  try {
    await requireActiveOrg(profile);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Subscription check failed." }, { status: 403 });
  }

  const supabase = await createClient();
  const allowed = await allowAiCall(supabase, profile.organization_id, "extract");
  if (!allowed) {
    return NextResponse.json(
      { error: "Your organization has hit its daily AI extraction limit (100). Try again tomorrow." },
      { status: 429 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large — max 10MB." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fields = await extractInvoiceFields(buffer, file.type);
    return NextResponse.json({ fields });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Extraction failed." }, { status: 502 });
  }
}
