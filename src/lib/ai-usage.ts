import type { SupabaseClient } from "@supabase/supabase-js";

export type AiFeature = "extract" | "copilot";

// Generous daily per-organization caps on paid AI calls. These are an abuse
// guard (stop a scripted/automated caller from blowing up the Anthropic bill),
// not usage rationing — every level in AI-COST-ANALYSIS.md's usage tiers is an
// order of magnitude below these, so a normal org only ever hits them by
// automating the endpoints.
export const AI_DAILY_LIMITS: Record<AiFeature, number> = {
  extract: 100,
  copilot: 100,
};

/**
 * Atomically counts one AI call for this org today via spin_ai_usage() and
 * reports whether it's still under the cap. Returns true (allowed, counted)
 * on any accounting failure, including the migration not being applied yet or
 * the counter row being unreachable — a margin guard should never be the thing
 * that breaks a user-facing AI feature.
 */
export async function allowAiCall(
  supabase: SupabaseClient,
  organizationId: string,
  feature: AiFeature
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("spin_ai_usage", {
      p_organization_id: organizationId,
      p_feature: feature,
      p_limit: AI_DAILY_LIMITS[feature],
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}