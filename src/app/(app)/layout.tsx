import Link from "next/link";
import { getCurrentProfile, getCurrentOrganization, isOrgLocked } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { MobileNavProvider } from "@/components/MobileNavContext";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const org = await getCurrentOrganization(profile);
  const locked = isOrgLocked(org);
  const trialDaysLeft = Math.ceil((new Date(org.trial_ends_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  const showTrialNudge = !locked && org.subscription_status === "trialing" && trialDaysLeft <= 3;

  return (
    <MobileNavProvider>
      <div className="flex min-h-screen w-full">
        <div className="print:hidden">
          <Sidebar profile={profile} industry={org.industry} orgName={org.name} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="print:hidden">
            <Header profile={profile} />
          </div>
          {(locked || showTrialNudge) && (
            <div className={`px-4 py-2 text-center text-sm print:hidden sm:px-6 ${locked ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
              {locked
                ? "Your trial has ended and this organization is read-only. "
                : `Your free trial ends in ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"}. `}
              <Link href="/billing" className="font-medium underline">
                {locked ? "Subscribe to keep making changes" : "Subscribe now"}
              </Link>
            </div>
          )}
          <main className="flex-1 bg-zinc-50 p-4 sm:p-6 print:bg-white print:p-0">{children}</main>
        </div>
      </div>
    </MobileNavProvider>
  );
}
