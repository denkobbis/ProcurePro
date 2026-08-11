-- Self-serve signup now also captures the org's industry, defaulting to
-- 'general' (safe fallback) if unset. nullif guards against an empty-string
-- metadata value throwing an invalid enum-input error at cast time — plain
-- coalesce only catches an actual NULL.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_org_id uuid;
  org_name text := new.raw_user_meta_data->>'create_organization_name';
  org_industry organization_industry := coalesce(nullif(new.raw_user_meta_data->>'industry', '')::organization_industry, 'general');
  invite_org_id uuid := nullif(new.raw_user_meta_data->>'organization_id', '')::uuid;
begin
  if org_name is not null and length(trim(org_name)) > 0 then
    insert into organizations (name, industry) values (trim(org_name), org_industry) returning id into new_org_id;
    insert into profiles (id, full_name, email, role, department_id, organization_id)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email, 'super_admin', null, new_org_id);
  elsif invite_org_id is not null then
    insert into profiles (id, full_name, email, role, department_id, organization_id)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', new.email),
      new.email,
      coalesce((new.raw_user_meta_data->>'role')::user_role, 'requester'),
      nullif(new.raw_user_meta_data->>'department_id', '')::uuid,
      invite_org_id
    );
  else
    raise exception 'Signup requires either create_organization_name or organization_id in user metadata';
  end if;
  return new;
end;
$$;
