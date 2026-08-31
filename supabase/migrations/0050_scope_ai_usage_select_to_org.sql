-- ai_usage_select was created with `using (true)` -- unlike every other
-- per-org table, it let any authenticated user (from any organization) read
-- every organization's daily AI extraction/copilot usage counts. The table
-- already has organization_id; the policy just never checked it.

drop policy if exists ai_usage_select on ai_usage;
create policy ai_usage_select on ai_usage for select
  using (organization_id = current_organization_id());
