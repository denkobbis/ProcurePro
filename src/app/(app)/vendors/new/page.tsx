import { getCurrentProfile, getCurrentOrganization, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createVendor } from "@/app/actions/vendors";
import NcdmbFields from "@/components/NcdmbFields";
import { Button } from "@/components/Button";
import { getIndustryModules } from "@/lib/industries";
import { FormShell, FormPanel, AsidePanel, FormField, fieldInputClass } from "@/components/FormLayout";

export default async function NewVendorPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);
  const org = await getCurrentOrganization(profile);
  const modules = getIndustryModules(org.industry);

  return (
    <FormShell
      backHref="/vendors"
      backLabel="Back to vendors"
      title="Add vendor"
      description="Bank details and payout setup happen on the vendor's own page once they're saved."
      form={
        <form action={createVendor}>
          <FormPanel title="Vendor details">
            <FormField label="Vendor name" span={12}>
              <input name="name" required className={fieldInputClass} />
            </FormField>
            <FormField label="Category" span={12}>
              <input name="category" className={fieldInputClass} />
            </FormField>
            <FormField label="Contact email" span={6}>
              <input name="contact_email" type="email" className={fieldInputClass} />
            </FormField>
            <FormField label="Contact phone" span={6}>
              <input name="contact_phone" className={fieldInputClass} />
            </FormField>
            <FormField label="Payment terms" span={12} hint="e.g. Net 30">
              <input name="payment_terms" className={fieldInputClass} />
            </FormField>
            <FormField label="Approval" span={12}>
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input type="checkbox" name="is_approved" className="rounded border-zinc-300 dark:border-zinc-600" />
                Mark as approved (can be used on purchase orders immediately)
              </label>
            </FormField>
          </FormPanel>

          <div className="mt-[18px]">
            <FormPanel title="Currency & compliance">
              <FormField label="Details" span={12}>
                <NcdmbFields showNcdmb={modules.ncdmb} />
              </FormField>
            </FormPanel>
          </div>

          <div className="mt-[18px]">
            <Button type="submit">Save vendor</Button>
          </div>
        </form>
      }
      aside={
        <AsidePanel title="What happens next">
          <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
            <li>Bank details and payout setup are added from the vendor&apos;s own page after saving.</li>
            <li>Unapproved vendors can still receive RFQs, but can&apos;t be selected on a purchase order until approved.</li>
            {modules.ncdmb && <li>NCDMB certificate expiry is tracked automatically and flagged before it lapses.</li>}
          </ul>
        </AsidePanel>
      }
    />
  );
}
