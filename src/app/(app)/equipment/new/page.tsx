import { getCurrentProfile, requireRole, PROCUREMENT_ROLES } from "@/lib/auth";
import { createEquipmentAsset } from "@/app/actions/equipment";
import { Button } from "@/components/Button";
import { FormShell, FormPanel, AsidePanel, FormField, fieldInputClass, fieldTextareaClass } from "@/components/FormLayout";

export default async function NewEquipmentAssetPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, PROCUREMENT_ROLES);

  return (
    <FormShell
      backHref="/equipment"
      backLabel="Back to equipment"
      title="Add equipment asset"
      form={
        <form action={createEquipmentAsset}>
          <FormPanel title="Asset details">
            <FormField label="Asset tag" span={6} hint="e.g. CR-001">
              <input name="asset_tag" required className={fieldInputClass} />
            </FormField>
            <FormField label="Category" span={6} hint="e.g. Crane, Nitrogen Converter">
              <input name="category" required className={fieldInputClass} />
            </FormField>
            <FormField label="Name / description" span={12} hint="e.g. 50-tonne mobile crane">
              <input name="name" required className={fieldInputClass} />
            </FormField>
            <FormField label="Day rate (₦)" span={6}>
              <input name="day_rate_ngn" type="number" min="0" step="0.01" required className={fieldInputClass} />
            </FormField>
            <FormField label="Notes" span={12}>
              <textarea name="notes" rows={2} className={fieldTextareaClass} />
            </FormField>
          </FormPanel>

          <div className="mt-[18px]">
            <Button type="submit">Save asset</Button>
          </div>
        </form>
      }
      aside={
        <AsidePanel title="Where this shows up">
          <p className="text-sm text-zinc-600">
            The day rate you set here is what leases are billed against once this asset is checked out on a request. Status starts as
            &ldquo;Available&rdquo; — it moves to &ldquo;On lease&rdquo; automatically when a lease is created.
          </p>
        </AsidePanel>
      }
    />
  );
}
