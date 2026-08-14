import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile, requireActiveOrg } from "@/lib/auth";
import { extractRequestFields, extractRequestFieldsFromText } from "@/lib/extract";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  try {
    await requireActiveOrg(profile);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Subscription check failed." }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const text = formData.get("text");

  try {
    if (typeof text === "string" && text.trim()) {
      const fields = await extractRequestFieldsFromText(text);
      return NextResponse.json({ fields });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File is too large — max 10MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fields = await extractRequestFields(buffer, file.type);
    return NextResponse.json({ fields });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Extraction failed." }, { status: 502 });
  }
}
