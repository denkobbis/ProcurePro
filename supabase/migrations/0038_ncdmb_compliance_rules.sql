-- ========== NCDMB compliance rules (per-category thresholds) ==========
-- NCDMB's actual minimum local-content targets vary by procurement category
-- and change periodically per NCDMB's own published guidelines — this app
-- deliberately does not hardcode any specific percentage as if it were fixed
-- regulation. Instead each organization defines its own rule per vendor
-- category (minimum local content % and whether a certificate is required),
-- sourced from whatever NCDMB guidance applies to their own contracts. The
-- compliance checker only ever evaluates vendors against these org-defined
-- rules, never an assumed official threshold.
create table ncdmb_compliance_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) default current_organization_id(),
  category text not null,
  minimum_local_content_percentage numeric(5,2), -- null = no minimum required, just certificate presence
  requires_certificate boolean not null default true,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (organization_id, category)
);

alter table ncdmb_compliance_rules enable row level security;

create policy ncdmb_compliance_rules_select on ncdmb_compliance_rules for select
  using (organization_id = current_organization_id());
create policy ncdmb_compliance_rules_write on ncdmb_compliance_rules for all
  using (organization_id = current_organization_id() and is_procurement_or_admin())
  with check (organization_id = current_organization_id() and is_procurement_or_admin());
