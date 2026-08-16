-- ========== Vendor invoices (3-way match: PO <-> receiving <-> invoice) ==========
create table invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) default current_organization_id(),
  po_id uuid not null references purchase_orders(id) on delete cascade,
  vendor_id uuid not null references vendors(id),
  invoice_number text not null,
  invoice_date date,
  currency currency_code not null default 'NGN',
  total_amount numeric(14,2) not null default 0,
  file_path text,
  file_name text,
  status text not null default 'pending_review' check (status in ('pending_review', 'matched', 'variance', 'approved')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  qty numeric(12,2) not null check (qty > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  po_line_item_id uuid references po_line_items(id),
  created_at timestamptz not null default now()
);

create index idx_invoices_po on invoices(po_id);
create index idx_invoices_org on invoices(organization_id);
create index idx_invoice_line_invoice on invoice_line_items(invoice_id);

alter table invoices enable row level security;
alter table invoice_line_items enable row level security;

-- Same visibility rule as purchase_orders itself: your own department's POs,
-- or any PO if you're procurement/admin.
create policy invoices_select on invoices for select using (
  organization_id = current_organization_id()
  and (
    exists (select 1 from purchase_orders po where po.id = invoices.po_id and po.department_id = current_department_id())
    or is_procurement_or_admin()
  )
);

create policy invoices_write on invoices for all using (
  organization_id = current_organization_id() and is_procurement_or_admin()
);

create policy invoice_line_select on invoice_line_items for select using (
  exists (
    select 1 from invoices i
    join purchase_orders po on po.id = i.po_id
    where i.id = invoice_line_items.invoice_id
      and i.organization_id = current_organization_id()
      and (po.department_id = current_department_id() or is_procurement_or_admin())
  )
);

create policy invoice_line_write on invoice_line_items for all using (
  exists (select 1 from invoices i where i.id = invoice_line_items.invoice_id and i.organization_id = current_organization_id())
  and is_procurement_or_admin()
);
