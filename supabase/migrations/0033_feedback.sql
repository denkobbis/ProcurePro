-- ========== In-app feedback (account menu -> short form) ==========
create table feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) default current_organization_id(),
  user_id uuid not null references profiles(id) default auth.uid(),
  message text not null,
  page_path text,
  created_at timestamptz not null default now()
);

create index idx_feedback_org on feedback(organization_id);

alter table feedback enable row level security;

-- Any signed-in org member can leave feedback for their own org, as themselves.
create policy feedback_insert on feedback for insert with check (
  organization_id = current_organization_id() and user_id = auth.uid()
);

-- No app UI reads this yet; admins can query it directly in Supabase.
create policy feedback_select on feedback for select using (
  organization_id = current_organization_id() and is_admin_role()
);
