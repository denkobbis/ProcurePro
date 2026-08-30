import type { NcdmbComplianceRule, Vendor } from "./database.types";

export type ComplianceVerdict = "compliant" | "at_risk" | "non_compliant" | "not_rated";

export interface ComplianceResult {
  verdict: ComplianceVerdict;
  reasons: string[];
  rule: NcdmbComplianceRule | null;
}

const EXPIRY_WARNING_DAYS = 60;

// Evaluates one vendor against whichever compliance rule matches its
// category. There's no built-in notion of what NCDMB actually requires —
// that's org-configured (see 0038_ncdmb_compliance_rules.sql) — so a vendor
// whose category has no rule is "not_rated", not silently compliant.
export function evaluateVendorCompliance(vendor: Vendor, rules: NcdmbComplianceRule[]): ComplianceResult {
  const rule = vendor.category ? (rules.find((r) => r.category.toLowerCase() === vendor.category!.toLowerCase()) ?? null) : null;
  if (!rule) return { verdict: "not_rated", reasons: ["No compliance rule set for this vendor's category yet."], rule: null };

  const reasons: string[] = [];
  let nonCompliant = false;
  let atRisk = false;

  if (rule.requires_certificate) {
    if (!vendor.ncdmb_certificate_number || !vendor.ncdmb_certificate_expiry) {
      nonCompliant = true;
      reasons.push("NCDMB certificate is required for this category but is missing.");
    } else {
      const daysLeft = Math.ceil((new Date(vendor.ncdmb_certificate_expiry).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      if (daysLeft < 0) {
        nonCompliant = true;
        reasons.push("NCDMB certificate has expired.");
      } else if (daysLeft <= EXPIRY_WARNING_DAYS) {
        atRisk = true;
        reasons.push(`NCDMB certificate expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`);
      }
    }
  }

  if (rule.minimum_local_content_percentage != null) {
    if (vendor.local_content_percentage == null) {
      nonCompliant = true;
      reasons.push(`Local content % not on file (requires ≥${rule.minimum_local_content_percentage}%).`);
    } else if (Number(vendor.local_content_percentage) < Number(rule.minimum_local_content_percentage)) {
      // Both are numeric() columns — Supabase returns them as strings, and a
      // bare `<` between two strings compares lexicographically ("5" > "40"),
      // which would backwards-classify a vendor as compliant when it isn't.
      nonCompliant = true;
      reasons.push(`Local content is ${vendor.local_content_percentage}%, below the ${rule.minimum_local_content_percentage}% required for "${rule.category}".`);
    }
  }

  if (nonCompliant) return { verdict: "non_compliant", reasons, rule };
  if (atRisk) return { verdict: "at_risk", reasons, rule };
  return { verdict: "compliant", reasons: reasons.length ? reasons : ["Meets the category's local content and certificate requirements."], rule };
}
