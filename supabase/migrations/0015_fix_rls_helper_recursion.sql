-- current_organization_id() (and its siblings) read profiles.* for the
-- calling user and are used inside RLS policies — including the policy ON
-- profiles itself (profiles_select). Left as SECURITY INVOKER (the default),
-- current_organization_id()'s internal SELECT from profiles re-triggers
-- profiles_select, which calls current_organization_id() again: infinite
-- recursion, discovered via a two-org isolation smoke test before this ever
-- reached the app. SECURITY DEFINER makes the internal lookup bypass RLS,
-- which is the standard Supabase pattern for this class of helper function.
create or replace function current_profile_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function current_department_id()
returns uuid language sql stable security definer set search_path = public as $$
  select department_id from profiles where id = auth.uid();
$$;

create or replace function current_organization_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from profiles where id = auth.uid();
$$;

create or replace function is_admin_role()
returns boolean language sql stable security definer set search_path = public as $$
  select current_profile_role() in ('finance_admin', 'super_admin');
$$;

create or replace function is_procurement_or_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select current_profile_role() in ('procurement_officer', 'finance_admin', 'super_admin');
$$;
