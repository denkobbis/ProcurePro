import { getCurrentProfile, getCurrentOrganization, isOrgLocked, ADMIN_ROLES } from "@/lib/auth";
import { startSubscription, cancelSubscription } from "@/app/actions/billing";
import { updateOrganizationSettings } from "@/app/actions/organization";
import { Button } from "@/components/Button";
import StatusBadge from "@/components/StatusBadge";
import { formatNaira } from "@/lib/money";
import { INDUSTRY_OPTIONS } from "@/lib/industries";
import { RecordSection, FactsPanel, NotePanel } from "@/components/RecordPanels";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const profile = await getCurrentProfile();
  const org = await getCurrentOrganization(profile);
  const canManage = ADMIN_ROLES.includes(profile.role);
  const locked = isOrgLocked(org);

  const trialEnds = new Date(org.trial_ends_at);
  const now = new Date();
  const daysLeftInTrial = Math.ceil((trialEnds.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-[38px] font-semibold leading-none tracking-tight text-zinc-900">Billing</h1>
        <p className="mt-2 text-sm text-zinc-500">ProcurePro subscription for your organization.</p>
      </div>

      {status === "success" && <NotePanel>Subscription active — thank you.</NotePanel>}
      {status === "error" && (
        <NotePanel tone="warn">Something went wrong confirming payment. If you were charged, contact support — otherwise, try again below.</NotePanel>
      )}
      {status === "canceled" && <NotePanel>Subscription canceled.</NotePanel>}

      <RecordSection title="Subscription">
        <div className="mb-4 flex items-center gap-2">
          <StatusBadge status={org.subscription_status} />
          {locked && <span className="text-xs font-medium text-red-600">Read-only — changes are blocked until this is resolved</span>}
        </div>

        <FactsPanel
          facts={[
            { label: "Plan", value: `ProcurePro Standard — ${formatNaira(25000)}/month` },
            ...(org.subscription_status === "trialing"
              ? [{ label: "Trial", value: `${daysLeftInTrial > 0 ? `${daysLeftInTrial} day${daysLeftInTrial === 1 ? "" : "s"} left` : "Ended"} (${trialEnds.toLocaleDateString()})` }]
              : []),
            ...(org.current_period_end ? [{ label: "Renews", value: new Date(org.current_period_end).toLocaleDateString() }] : []),
          ]}
        />

        {canManage ? (
          <>
            {(org.subscription_status === "trialing" || org.subscription_status === "past_due" || org.subscription_status === "canceled") && (
              <form action={startSubscription} className="mt-4">
                <Button type="submit">{org.subscription_status === "trialing" ? "Subscribe now" : "Update payment method"}</Button>
                <p className="mt-2 text-xs text-zinc-500">You&apos;ll be taken to Paystack&apos;s secure checkout to enter your card.</p>
              </form>
            )}
            {org.subscription_status === "active" && (
              <form action={cancelSubscription} className="mt-4">
                <Button type="submit" variant="danger" size="sm">Cancel subscription</Button>
              </form>
            )}
          </>
        ) : (
          <p className="mt-4 text-sm text-zinc-400">Only finance/admin can manage billing.</p>
        )}
      </RecordSection>

      {canManage && (
        <RecordSection title="Organization">
          <form action={updateOrganizationSettings} className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-500">Name</label>
              <input
                name="name"
                defaultValue={org.name}
                required
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500">Line of work</label>
              <select
                name="industry"
                defaultValue={org.industry}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-400">Controls which features (e.g. Equipment, NCDMB compliance) show up in the sidebar.</p>
            </div>
            <Button type="submit" variant="secondary" size="sm">Save</Button>
          </form>
        </RecordSection>
      )}
    </div>
  );
}
