-- Basic abuse guard on the public /signup route — no auth, no org context yet,
-- so this can't use the usual organization_id-scoped RLS pattern.
create table signup_attempts (
  id bigserial primary key,
  ip_address text not null,
  created_at timestamptz not null default now()
);
create index signup_attempts_ip_created_idx on signup_attempts (ip_address, created_at);

alter table signup_attempts enable row level security;

create policy signup_attempts_insert on signup_attempts for insert to anon, authenticated with check (true);
create policy signup_attempts_select on signup_attempts for select to anon, authenticated using (true);
