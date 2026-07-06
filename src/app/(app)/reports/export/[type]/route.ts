import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, PROCUREMENT_ROLES } from "@/lib/auth";
import { getSpendByDepartment, getSpendByCategory, getSpendByVendor, getSpendTrend, toCsv } from "@/lib/reports";

const REPORTS = {
  department: getSpendByDepartment,
  category: getSpendByCategory,
  vendor: getSpendByVendor,
  trend: getSpendTrend,
} as const;

export async function GET(_request: Request, { params }: { params: Promise<{ type: string }> }) {
  const profile = await getCurrentProfile();
  if (!PROCUREMENT_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { type } = await params;
  const getter = REPORTS[type as keyof typeof REPORTS];
  if (!getter) {
    return NextResponse.json({ error: "Unknown report type" }, { status: 404 });
  }

  const supabase = await createClient();
  const rows = await getter(supabase);
  const csv = toCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${type}-spend.csv"`,
    },
  });
}
