-- ========== Marketing leads (landing page "request a demo" form) ==========
-- Pre-account captures from the marketing site — visitors at the top of the
-- funnel, before they sign up. Deliberately NOT tied to an organization: these
-- are strangers evaluating the product, not tenants.
create table marketing_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  email text not null,
  phone text,
  message text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  -- Sales funnel state, updated by whoever owns follow-up.
  status text not null default 'new' check (status in ('new', 'contacted', 'won', 'lost')),
  created_at timestamptz not null default now()
);

create index idx_marketing_leads_created on marketing_leads (created_at desc);
create index idx_marketing_leads_utm on marketing_leads (utm_source, utm_medium, utm_campaign);

alter table marketing_leads enable row level security;

-- Anyone on the marketing site can leave a lead; the server action validates
-- the email and truncates fields before this insert is ever reached.
create policy marketing_leads_insert on marketing_leads for insert
  to anon, authenticated
  with check (true);

-- No select policy on purpose: a shared marketing dataset must not be readable
-- by whichever org happens to be signed in (unlike feedback, which is scoped
-- per organization). Query it in the Supabase SQL editor — the postgres role
-- bypasses RLS — or add an app-facing policy later if a dashboard is built.
--
-- create policy marketing_leads_select on marketing_leads for select
--   using (...);