-- Tailors ProcurePro for global-sourcing / equipment-leasing procurement
-- companies (oil & gas OEM parts + equipment, Nigerian Content compliance),
-- per the "Brisk Integrated Services" use case. Eight additions:
--   1. Manufacturer part number (MPN) + OEM brand on requests and PO lines
--   2. Shipping/customs stages in the PO lifecycle
--   3. Multi-currency at the vendor/PO level
--   4. Equipment/asset leasing register
--   5. NCDMB / Local Content compliance fields on vendors + POs
--   6. Vendor certification expiry tracking (extends existing documents jsonb)
--   7. Landed cost (freight + customs duty) on top of unit price
--   8. RFQ / multi-vendor quote comparison before PO

-- ========== 1. MPN / OEM brand ==========
alter table requests add column mpn text;
alter table requests add column oem_brand text;

alter table po_line_items add column mpn text;
alter table po_line_items add column oem_brand text;

-- ========== 2. Shipping/customs PO stages ==========
-- Inserted between sent_to_vendor and partially_received. Optional stages —
-- domestic POs can skip straight to receiving as before.
alter type po_status add value if not exists 'in_transit' after 'sent_to_vendor';
alter type po_status add value if not exists 'customs_clearance' after 'in_transit';

-- ========== 3. Multi-currency ==========
create type currency_code as enum ('NGN', 'USD', 'EUR', 'GBP');

alter table vendors add column default_currency currency_code not null default 'NGN';

alter table purchase_orders add column currency currency_code not null default 'NGN';
alter table purchase_orders add column fx_rate_to_ngn numeric(14,6) not null default 1;
alter table purchase_orders add column total_amount_ngn numeric(14,2) not null default 0;

-- ========== 7. Landed cost ==========
-- Freight and customs duty are entered directly in NGN (paid locally to
-- Nigerian freight forwarders/customs regardless of the PO's own currency).
alter table purchase_orders add column freight_cost_ngn numeric(14,2) not null default 0;
alter table purchase_orders add column customs_duty_ngn numeric(14,2) not null default 0;

-- ========== 2 (cont). Shipping/customs detail fields ==========
alter table purchase_orders add column carrier text;
alter table purchase_orders add column tracking_number text;
alter table purchase_orders add column eta date;
alter table purchase_orders add column customs_reference text;
alter table purchase_orders add column customs_cleared_at timestamptz;

-- ========== 5. NCDMB / Local Content compliance ==========
alter table vendors add column ncdmb_compliant boolean not null default false;
alter table vendors add column ncdmb_certificate_number text;
alter table vendors add column ncdmb_certificate_expiry date;
alter table vendors add column local_content_percentage numeric(5,2) check (local_content_percentage between 0 and 100);

-- Snapshotted onto the PO at creation time so a later change to the vendor's
-- compliance record doesn't retroactively alter a historical PO's record.
alter table purchase_orders add column local_content_percentage numeric(5,2);
alter table purchase_orders add column ncdmb_certificate_number text;

-- ========== 4. Equipment / asset leasing register ==========
create type equipment_status as enum ('available', 'on_lease', 'maintenance', 'retired');
create type lease_status as enum ('active', 'returned', 'overdue');

create table equipment_assets (
  id uuid primary key default gen_random_uuid(),
  asset_tag text not null unique,
  name text not null,
  category text not null,
  status equipment_status not null default 'available',
  day_rate_ngn numeric(14,2) not null default 0,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table equipment_leases (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references equipment_assets(id) on delete cascade,
  client_name text not null,
  start_date date not null,
  expected_return_date date not null,
  actual_return_date date,
  day_rate_ngn numeric(14,2) not null,
  status lease_status not null default 'active',
  return_condition text,
  return_inspection_pass boolean,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  check (expected_return_date >= start_date)
);

create index idx_equipment_leases_asset on equipment_leases(asset_id);

-- ========== 8. RFQ / multi-vendor quote comparison ==========
create type rfq_status as enum ('open', 'awarded', 'cancelled');

create table rfqs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  status rfq_status not null default 'open',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (request_id)
);

create table rfq_quotes (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references rfqs(id) on delete cascade,
  vendor_id uuid not null references vendors(id),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  currency currency_code not null default 'NGN',
  lead_time_days int,
  notes text,
  is_winner boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (rfq_id, vendor_id)
);

create index idx_rfq_quotes_rfq on rfq_quotes(rfq_id);

-- ========== RLS for new tables ==========
alter table equipment_assets enable row level security;
alter table equipment_leases enable row level security;
alter table rfqs enable row level security;
alter table rfq_quotes enable row level security;

create policy equipment_assets_select on equipment_assets for select using (auth.role() = 'authenticated');
create policy equipment_assets_write on equipment_assets for all using (is_procurement_or_admin()) with check (is_procurement_or_admin());

create policy equipment_leases_select on equipment_leases for select using (auth.role() = 'authenticated');
create policy equipment_leases_write on equipment_leases for all using (is_procurement_or_admin()) with check (is_procurement_or_admin());

create policy rfqs_select on rfqs for select using (
  is_procurement_or_admin()
  or exists (select 1 from requests r where r.id = request_id and r.requester_id = auth.uid())
);
create policy rfqs_write on rfqs for all using (is_procurement_or_admin()) with check (is_procurement_or_admin());

create policy rfq_quotes_select on rfq_quotes for select using (
  is_procurement_or_admin()
  or exists (
    select 1 from rfqs q join requests r on r.id = q.request_id
    where q.id = rfq_id and r.requester_id = auth.uid()
  )
);
create policy rfq_quotes_write on rfq_quotes for all using (is_procurement_or_admin()) with check (is_procurement_or_admin());
