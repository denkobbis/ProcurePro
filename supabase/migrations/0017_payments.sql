-- Vendor payout details + purchase order payment tracking (Paystack/Flutterwave
-- transfer disbursement to vendors). Applied directly against the live project
-- via the Supabase MCP server and captured here afterward for reproducibility.

create type payment_provider as enum ('paystack', 'flutterwave');
create type payment_attempt_status as enum ('pending', 'success', 'failed', 'reversed');
create type po_payment_status as enum ('unpaid', 'processing', 'paid', 'failed');

-- Vendor payout details. bank_name is the human-readable bank; each provider
-- has its own bank code numbering, resolved live from that provider's bank
-- list at transfer time rather than stored, so one field works for both.
-- account_name is resolved/verified (via Paystack's account-resolve endpoint)
-- when these are saved, to catch typos before real money moves.
alter table vendors add column bank_name text;
alter table vendors add column account_number text;
alter table vendors add column account_name text;
alter table vendors add column paystack_recipient_code text;

alter table purchase_orders add column payment_status po_payment_status not null default 'unpaid';

-- One row per payment attempt (an org may retry after a failure), so this is
-- an audit trail, not just a status field.
create table payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) default current_organization_id(),
  purchase_order_id uuid not null references purchase_orders(id),
  provider payment_provider not null,
  amount numeric(14,2) not null,
  currency currency_code not null default 'NGN',
  status payment_attempt_status not null default 'pending',
  provider_reference text,
  provider_recipient_code text,
  failure_reason text,
  initiated_by uuid references profiles(id),
  initiated_at timestamptz not null default now(),
  completed_at timestamptz,
  raw_webhook_payload jsonb,
  created_at timestamptz not null default now()
);

alter table payments enable row level security;

-- Anyone who can manage procurement can see payment status; only finance/admin
-- can trigger a payment — moving real money is a stricter bar than editing a PO.
create policy payments_select on payments for select using (
  organization_id = current_organization_id() and is_procurement_or_admin()
);
create policy payments_write on payments for all
  using (organization_id = current_organization_id() and is_admin_role())
  with check (organization_id = current_organization_id() and is_admin_role());
