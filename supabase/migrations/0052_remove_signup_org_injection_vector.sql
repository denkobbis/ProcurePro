-- CRITICAL: handle_new_user() had an `elsif invite_org_id is not null` branch
-- that inserted a new profile directly into whatever organization_id (and
-- whatever role, including super_admin) was found in the new auth user's
-- raw_user_meta_data. That metadata is set via the `data` field of
-- supabase.auth.signUp()'s `options` -- which is entirely client-controlled,
-- not server-verified. Confirmed live and reverted: a raw POST to
-- /auth/v1/signup with just the public anon key and
-- {"organization_id": "<any-org>", "role": "super_admin"} in `data` created a
-- profiles row with exactly that organization_id and role -- a full
-- cross-tenant privilege escalation reachable by anyone on the internet, no
-- authentication or invitation required, since org ids aren't secret (any
-- existing employee already knows their own org's id and could have used
-- this to self-promote to super_admin within their own org too).
--
-- This branch has no legitimate caller: `supabase.auth.signUp()` is called
-- exactly once in the app (actions/auth.ts's self-serve signUp, which only
-- ever sets create_organization_name/full_name/industry), and the actual
-- admin-invite path (actions/users.ts's createUser) uses
-- admin.auth.admin.createUser() via the service-role client, which never
-- goes through this trigger's metadata-trust path at all. Removing it
-- entirely closes the hole with no loss of functionality.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  new_org_id uuid;
  org_name text := new.raw_user_meta_data->>'create_organization_name';
  org_industry organization_industry := coalesce(nullif(new.raw_user_meta_data->>'industry', '')::organization_industry, 'general');
begin
  if org_name is not null and length(trim(org_name)) > 0 then
    insert into organizations (name, industry) values (trim(org_name), org_industry) returning id into new_org_id;
    insert into profiles (id, full_name, email, role, department_id, organization_id)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email, 'super_admin', null, new_org_id);
  else
    raise exception 'Signup requires create_organization_name in user metadata';
  end if;
  return new;
end;
$$;
