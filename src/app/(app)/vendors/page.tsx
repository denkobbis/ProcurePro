import Link from "next/link";
import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import { BuildingIcon, SparkleIcon } from "@/components/icons";
import VendorsTable, { type VendorRow } from "./VendorsTable";
import type { Vendor } from "@/lib/database.types";

export default async function VendorsPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  const supabase = await createClient();
  const { data: vendors } = await supabase.from("vendors").select("*").order("name");
  const rows = (vendors ?? []) as Vendor[];

  const accountGroups = new Map<string, string[]>();
  for (const v of rows) {
    if (!v.account_number) continue;
    accountGroups.set(v.account_number, [...(accountGroups.get(v.account_number) ?? []), v.name]);
  }
  const sharedGroups = [...accountGroups.entries()].filter(([, names]) => names.length > 1);
  const sharedVendorNames = new Set(sharedGroups.flatMap(([, names]) => names));

  const tableRows: VendorRow[] = rows.map((v) => ({
    id: v.id,
    name: v.name,
    ncdmb: v.ncdmb_compliant,
    sharedAccount: sharedVendorNames.has(v.name),
    category: v.category ?? "—",
    contact: v.contact_email ?? "—",
    paymentTerms: v.payment_terms ?? "—",
    currency: v.default_currency,
    approved: v.is_approved,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[38px] font-semibold leading-none tracking-tight text-zinc-900 dark:text-zinc-100">Vendors</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Every vendor on file, with compliance and payment details.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/vendors/export" className="text-sm font-medium text-zinc-500 hover:text-brand-700 hover:underline dark:text-zinc-400 dark:hover:text-brand-400">
            Export CSV
          </Link>
          <ButtonLink href="/vendors/new">Add vendor</ButtonLink>
        </div>
      </div>

      {sharedGroups.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          <SparkleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <span className="font-medium">{sharedGroups.length} bank account{sharedGroups.length === 1 ? "" : "s"} shared by multiple vendors</span> —{" "}
            {sharedGroups.map(([, names]) => names.join(" & ")).join("; ")}. Worth confirming before the next payout.
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <EmptyState icon={<BuildingIcon />} title="No vendors yet" action={<ButtonLink href="/vendors/new" size="sm">Add vendor</ButtonLink>} />
        </div>
      ) : (
        <VendorsTable rows={tableRows} />
      )}
    </div>
  );
}
