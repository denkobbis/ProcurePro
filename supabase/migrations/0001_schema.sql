-- ProcurePro core schema
-- Run in Supabase SQL editor or via `supabase db push`

create extension if not exists "pgcrypto";

-- ========== Enums ==========
create type user_role as enum ('requester', 'approver', 'procurement_officer', 'finance_admin', 'super_admin');
create type request_status as enum ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'converted_to_po');
create type request_urgency as enum ('low', 'normal', 'high', 'critical');
create type approval_status as enum ('pending', 'approved', 'rejected', 'info_requested');
create type po_status as enum ('draft', 'sent_to_vendor', 'partially_received', 'fully_received', 'closed');
create type budget_period as enum ('monthly', 'quarterly', 'annual');

-- ========== Departments ==========
create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- ========== Profiles (extends auth.users) ==========
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role user_role not null default 'requester',
  department_id uuid references departments(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ========== Vendors ==========
create table vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  contact_email text,
  contact_phone text,
  payment_terms text,
  bank_details jsonb,
  documents jsonb not null default '[]'::jsonb,
  is_approved boolean not null default false,
  performance_notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ========== Budgets ==========
create table budgets (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id) on delete cascade,
  category text not null,
  period budget_period not null default 'monthly',
  period_start date not null,
  period_end date not null,
  allocated_amount numeric(14,2) not null check (allocated_amount >= 0),
  hard_block boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (department_id, category, period_start, period_end)
);

-- ========== Approval routing rules (configurable thresholds) ==========
create table approval_rules (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references departments(id) on delete cascade, -- null = applies to all departments
  min_amount numeric(14,2) not null default 0,
  max_amount numeric(14,2), -- null = no upper bound
  approver_role user_role not null,
  step_order int not null,
  created_at timestamptz not null default now()
);

-- ========== Purchase Requests ==========
create table requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  requester_id uuid not null references profiles(id),
  department_id uuid not null references departments(id),
  category text not null,
  description text not null,
  qty numeric(12,2) not null check (qty > 0),
  est_unit_cost numeric(14,2) not null check (est_unit_cost >= 0),
  vendor_id uuid references vendors(id),
  justification text,
  urgency request_urgency not null default 'normal',
  status request_status not null default 'draft',
  current_step int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_requests_department on requests(department_id);
create index idx_requests_requester on requests(requester_id);
create index idx_requests_status on requests(status);

create table request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table request_comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  author_id uuid not null references profiles(id),
  comment text not null,
  created_at timestamptz not null default now()
);

-- ========== Approvals (instances of the workflow per request) ==========
create table approvals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  step_order int not null,
  approver_role user_role not null,
  approver_id uuid references profiles(id), -- assigned once routed; may resolve via delegation
  status approval_status not null default 'pending',
  comment text,
  acted_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_approvals_request on approvals(request_id);
create index idx_approvals_approver on approvals(approver_id);

-- ========== Delegations ==========
create table delegations (
  id uuid primary key default gen_random_uuid(),
  approver_id uuid not null references profiles(id),
  delegate_id uuid not null references profiles(id),
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

-- ========== Purchase Orders ==========
create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  request_id uuid references requests(id),
  vendor_id uuid not null references vendors(id),
  department_id uuid not null references departments(id),
  status po_status not null default 'draft',
  total_amount numeric(14,2) not null default 0,
  delivery_terms text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_po_department on purchase_orders(department_id);
create index idx_po_vendor on purchase_orders(vendor_id);

create table po_line_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references purchase_orders(id) on delete cascade,
  description text not null,
  qty numeric(12,2) not null check (qty > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  received_qty numeric(12,2) not null default 0,
  quality_pass boolean,
  created_at timestamptz not null default now()
);

-- ========== Audit Log ==========
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  actor_id uuid references profiles(id),
  details jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_entity on audit_log(entity_type, entity_id);

-- ========== Notifications ==========
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on notifications(user_id, is_read);

-- ========== updated_at triggers ==========
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_requests_updated_at before update on requests
  for each row execute function set_updated_at();

create trigger trg_po_updated_at before update on purchase_orders
  for each row execute function set_updated_at();
