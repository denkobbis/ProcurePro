-- Multi-tenancy, part 1: organizations table, organization_id on every
-- top-level table, per-organization uniqueness, per-organization numbering.
--
-- This migration was applied directly against the live project via the
-- Supabase MCP server and is captured here afterward so the migration
-- history stays reproducible. If running against a fresh database that has
-- no existing rows, the "Denbis Global Resources" backfill step is a no-op.

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  po_number_seq integer not null default 0,
  request_number_seq integer not null default 0,
  created_at timestamptz not null default now()
);

alter table organizations enable row level security;

insert into organizations (name) values ('Denbis Global Resources');

alter table profiles add column organization_id uuid references organizations(id);
update profiles set organization_id = (select id from organizations where name = 'Denbis Global Resources');
alter table profiles alter column organization_id set not null;

create or replace function current_organization_id()
returns uuid language sql stable set search_path = public as $$
  select organization_id from profiles where id = auth.uid();
$$;

alter table departments add column organization_id uuid references organizations(id);
update departments set organization_id = (select id from organizations where name = 'Denbis Global Resources');
alter table departments alter column organization_id set not null;
alter table departments alter column organization_id set default current_organization_id();

alter table vendors add column organization_id uuid references organizations(id);
update vendors set organization_id = (select id from organizations where name = 'Denbis Global Resources');
alter table vendors alter column organization_id set not null;
alter table vendors alter column organization_id set default current_organization_id();

alter table budgets add column organization_id uuid references organizations(id);
update budgets set organization_id = (select id from organizations where name = 'Denbis Global Resources');
alter table budgets alter column organization_id set not null;
alter table budgets alter column organization_id set default current_organization_id();

alter table approval_rules add column organization_id uuid references organizations(id);
update approval_rules set organization_id = (select id from organizations where name = 'Denbis Global Resources');
alter table approval_rules alter column organization_id set not null;
alter table approval_rules alter column organization_id set default current_organization_id();

alter table requests add column organization_id uuid references organizations(id);
update requests set organization_id = (select id from organizations where name = 'Denbis Global Resources');
alter table requests alter column organization_id set not null;
alter table requests alter column organization_id set default current_organization_id();

alter table purchase_orders add column organization_id uuid references organizations(id);
update purchase_orders set organization_id = (select id from organizations where name = 'Denbis Global Resources');
alter table purchase_orders alter column organization_id set not null;
alter table purchase_orders alter column organization_id set default current_organization_id();

alter table equipment_assets add column organization_id uuid references organizations(id);
update equipment_assets set organization_id = (select id from organizations where name = 'Denbis Global Resources');
alter table equipment_assets alter column organization_id set not null;
alter table equipment_assets alter column organization_id set default current_organization_id();

alter table audit_log add column organization_id uuid references organizations(id);
update audit_log set organization_id = (select id from organizations where name = 'Denbis Global Resources');
alter table audit_log alter column organization_id set not null;
alter table audit_log alter column organization_id set default current_organization_id();

alter table notifications add column organization_id uuid references organizations(id);
update notifications set organization_id = (select id from organizations where name = 'Denbis Global Resources');
alter table notifications alter column organization_id set not null;
alter table notifications alter column organization_id set default current_organization_id();

alter table delegations add column organization_id uuid references organizations(id);
update delegations set organization_id = (select id from organizations where name = 'Denbis Global Resources');
alter table delegations alter column organization_id set not null;
alter table delegations alter column organization_id set default current_organization_id();

-- Per-organization uniqueness (was global)
alter table departments drop constraint departments_name_key;
alter table departments add constraint departments_org_name_key unique (organization_id, name);

alter table vendors drop constraint vendors_name_key;
alter table vendors add constraint vendors_org_name_key unique (organization_id, name);

alter table equipment_assets drop constraint equipment_assets_asset_tag_key;
alter table equipment_assets add constraint equipment_assets_org_tag_key unique (organization_id, asset_tag);

alter table requests drop constraint requests_request_number_key;
alter table requests add constraint requests_org_request_number_key unique (organization_id, request_number);

alter table purchase_orders drop constraint purchase_orders_po_number_key;
alter table purchase_orders add constraint purchase_orders_org_po_number_key unique (organization_id, po_number);

-- Per-organization numbering (was a single global sequence). Same zero-arg
-- signature as before, so no caller changes are needed anywhere in the app.
create or replace function next_request_number()
returns text language plpgsql security definer set search_path = public as $$
declare
  org_id uuid := current_organization_id();
  seq int;
begin
  if org_id is null then raise exception 'No organization on your profile'; end if;
  update organizations set request_number_seq = request_number_seq + 1
    where id = org_id
    returning request_number_seq into seq;
  return 'REQ-' || lpad(seq::text, 6, '0');
end;
$$;

create or replace function next_po_number()
returns text language plpgsql security definer set search_path = public as $$
declare
  org_id uuid := current_organization_id();
  seq int;
begin
  if org_id is null then raise exception 'No organization on your profile'; end if;
  update organizations set po_number_seq = po_number_seq + 1
    where id = org_id
    returning po_number_seq into seq;
  return 'PO-' || lpad(seq::text, 6, '0');
end;
$$;

update organizations set
  request_number_seq = (select coalesce(max(substring(request_number from 5)::int), 0) from requests),
  po_number_seq = (select coalesce(max(substring(po_number from 4)::int), 0) from purchase_orders)
where name = 'Denbis Global Resources';
