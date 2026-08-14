import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile, requireActiveOrg, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { answerSpendQuestion } from "@/lib/spend-copilot";

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);
  try {
    await requireActiveOrg(profile);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Subscription check failed." }, { status: 403 });
  }

  const { question } = await req.json().catch(() => ({ question: "" }));
  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const answer = await answerSpendQuestion(supabase, question);
    return NextResponse.json({ answer });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't answer that." }, { status: 502 });
  }
}
