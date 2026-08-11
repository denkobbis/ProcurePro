import type { OrganizationIndustry } from "@/lib/database.types";

// Single source of truth for what an organization's industry shows/hides.
// "general" is the safe default for unmapped/future industries — when in
// doubt, show everything rather than hide something a real customer needs.
export const INDUSTRIES: Record<OrganizationIndustry, { label: string; modules: { equipment: boolean; ncdmb: boolean } }> = {
  oil_gas: {
    label: "Oil & Gas / Heavy Industry",
    modules: { equipment: true, ncdmb: true },
  },
  construction: {
    label: "Construction / EPC",
    modules: { equipment: true, ncdmb: false },
  },
  trading: {
    label: "Trading / Import-Distribution",
    modules: { equipment: false, ncdmb: false },
  },
  general: {
    label: "General / Other",
    modules: { equipment: true, ncdmb: true },
  },
};

export const INDUSTRY_OPTIONS = Object.entries(INDUSTRIES).map(([value, { label }]) => ({
  value: value as OrganizationIndustry,
  label,
}));

export function getIndustryModules(industry: OrganizationIndustry) {
  return INDUSTRIES[industry].modules;
}
