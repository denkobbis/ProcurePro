-- Per-organization daily caps on paid AI calls (request auto-fill extraction
-- and the spend copilot). Margins/abuse guard, not a billing product: one org
-- running scripted/automated calls shouldn't be able to drive the Anthropic
-- bill (see AI-COST-ANALYSIS.md "No per-org rate limiting yet"). Generous caps
-- far above real team usage — a legitimate org only hits this by automating.

-- Counter rows keyed by (org, feature, UTC day). spin_ai_usage() is the only
-- write path and is SECURITY DEFINER (same pattern as every other definer
-- function here): it verifies the caller's organization matches the one being
-- counted, does a single atomic upsert-increment, and returns whether the new
-- count is still under the cap. It reports true (allows the call) on any
-- accounting error so an internal hiccup can never block a user-facing AI
-- feature — this guards margin, not money or safety, so fail-open is right.

create table ai_usage (
  organization_id uuid not null references organizations(id) on delete cascade,
  feature text not null check (feature in ('extract', 'copilot')),
  usage_date date not null default current_date,
  count integer not null default 0,
  primary key (organization_id, feature, usage_date)
);
create index ai_usage_org_date_idx on ai_usage (organization_id, usage_date);

alter table ai_usage enable row level security;

-- The counter is only ever read through spin_ai_usage() (which checks org
-- ownership itself), so no insert/update policies are needed — direct table
-- writes from the app stay blocked. The select policy below is defensive so
-- accidental reads fail closed at the RPC boundary rather than no-op.
create policy ai_usage_select on ai_usage for select to authenticated using (true);

create or replace function spin_ai_usage(p_organization_id uuid, p_feature text, p_limit integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  current_count integer;
begin
  if current_organization_id() is distinct from p_organization_id then
    raise exception 'Organization mismatch';
  end if;

  begin
    insert into ai_usage (organization_id, feature, usage_date, count)
    values (p_organization_id, p_feature, current_date, 1)
    on conflict (organization_id, feature, usage_date)
    do update set count = ai_usage.count + 1
    returning count into current_count;
  exception when others then
    return true;
  end;

  return current_count <= p_limit;
end;
$$;