import { getCurrentProfile, getCurrentOrganization, isOrgLocked, ADMIN_ROLES } from "@/lib/auth";
import { startSubscription, cancelSubscription } from "@/app/actions/billing";
import { updateOrganizationName } from "@/app/actions/organization";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/Button";
import StatusBadge from "@/components/StatusBadge";
import { formatNaira } from "@/lib/money";

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
  const daysLeftInTrial = Math.ceil((trialEnds.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader title="Billing" description="ProcurePro subscription for your organization." />

      {status === "success" && (
        <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Subscription active — thank you.
        </div>
      )}
      {status === "error" && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Something went wrong confirming payment. If you were charged, contact support — otherwise, try again below.
        </div>
      )}
      {status === "canceled" && (
        <div className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
          Subscription canceled.
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <StatusBadge status={org.subscription_status} />
          {locked && <span className="text-xs font-medium text-red-600">Read-only — changes are blocked until this is resolved</span>}
        </div>

        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Plan</dt>
            <dd className="text-zinc-900">ProcurePro Standard — {formatNaira(25000)}/month</dd>
          </div>
          {org.subscription_status === "trialing" && (
            <div>
              <dt className="text-zinc-500">Trial</dt>
              <dd className="text-zinc-900">
                {daysLeftInTrial > 0 ? `${daysLeftInTrial} day${daysLeftInTrial === 1 ? "" : "s"} left` : "Ended"} ({trialEnds.toLocaleDateString()})
              </dd>
            </div>
          )}
          {org.current_period_end && (
            <div>
              <dt className="text-zinc-500">Renews</dt>
              <dd className="text-zinc-900">{new Date(org.current_period_end).toLocaleDateString()}</dd>
            </div>
          )}
        </dl>

        {canManage ? (
          <>
            {(org.subscription_status === "trialing" || org.subscription_status === "past_due" || org.subscription_status === "canceled") && (
              <form action={startSubscription} className="mt-5">
                <Button type="submit">
                  {org.subscription_status === "trialing" ? "Subscribe now" : "Update payment method"}
                </Button>
                <p className="mt-2 text-xs text-zinc-500">You&apos;ll be taken to Paystack&apos;s secure checkout to enter your card.</p>
              </form>
            )}
            {org.subscription_status === "active" && (
              <form action={cancelSubscription} className="mt-5">
                <Button type="submit" variant="danger" size="sm">Cancel subscription</Button>
              </form>
            )}
          </>
        ) : (
          <p className="mt-5 text-sm text-zinc-400">Only finance/admin can manage billing.</p>
        )}
      </div>

      {canManage && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">Organization</h2>
          <form action={updateOrganizationName} className="flex flex-wrap items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs text-zinc-500">Name</label>
              <input
                name="name"
                defaultValue={org.name}
                required
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">Save</Button>
          </form>
        </div>
      )}
    </div>
  );
}
