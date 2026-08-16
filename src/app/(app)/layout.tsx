import Link from "next/link";
import { cookies } from "next/headers";
import { getCurrentProfile, getCurrentOrganization, isOrgLocked, daysUntilTrialEnd, APPROVER_ROLES, PROCUREMENT_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { MobileNavProvider } from "@/components/MobileNavContext";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const cookieStore = await cookies();
  const isDark = cookieStore.get("theme")?.value === "dark";
  const org = await getCurrentOrganization(profile);
  const locked = isOrgLocked(org);
  const trialDaysLeft = daysUntilTrialEnd(org);
  const showTrialNudge = !locked && org.subscription_status === "trialing" && trialDaysLeft <= 3;

  const supabase = await createClient();
  const [{ count: requestsOpen }, approvalsAwaiting, { count: poOpen }] = await Promise.all([
    supabase.from("requests").select("id", { count: "exact", head: true }).not("status", "in", "(rejected,converted_to_po)"),
    APPROVER_ROLES.includes(profile.role)
      ? supabase.from("v_actionable_approvals").select("id", { count: "exact", head: true }).then((r) => r.count ?? 0)
      : Promise.resolve(0),
    PROCUREMENT_ROLES.includes(profile.role)
      ? supabase.from("purchase_orders").select("id", { count: "exact", head: true }).not("status", "in", "(fully_received,closed)")
      : Promise.resolve({ count: 0 }),
  ]);

  return (
    <MobileNavProvider>
      <div className="flex min-h-screen w-full">
        <div className="print:hidden">
          <Sidebar
            profile={profile}
            industry={org.industry}
            orgName={org.name}
            counts={{ requestsOpen: requestsOpen ?? 0, approvalsAwaiting, poOpen: poOpen ?? 0 }}
            initialIsDark={isDark}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="print:hidden">
            <Topbar profile={profile} />
          </div>
          {(locked || showTrialNudge) && (
            <div
              className={`px-4 py-2 text-center text-sm print:hidden sm:px-6 ${
                locked ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
              }`}
            >
              {locked
                ? "Your trial has ended and this organization is read-only. "
                : `Your free trial ends in ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"}. `}
              <Link href="/billing" className="font-medium underline">
                {locked ? "Subscribe to keep making changes" : "Subscribe now"}
              </Link>
            </div>
          )}
          <main className="flex-1 bg-zinc-50 p-[26px] sm:p-7 print:bg-white print:p-0 dark:bg-zinc-950">{children}</main>
        </div>
      </div>
    </MobileNavProvider>
  );
}
