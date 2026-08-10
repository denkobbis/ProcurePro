-- profiles_update_self's RLS lets a user update their own row (id = auth.uid())
-- with no column-level restriction — nothing stopped a requester from setting
-- their own role to super_admin. RLS is row-level only, so this needs a
-- trigger to protect specific columns instead: non-admins may edit their own
-- profile (name, etc.) but not role/organization_id/is_active.
create or replace function protect_profile_privileged_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_admin_role() then
    if NEW.role <> OLD.role then
      raise exception 'Only finance/admin can change a user''s role';
    end if;
    if NEW.organization_id <> OLD.organization_id then
      raise exception 'Cannot change organization';
    end if;
    if NEW.is_active <> OLD.is_active then
      raise exception 'Only finance/admin can activate or deactivate a user';
    end if;
  end if;
  return NEW;
end;
$$;

create trigger trg_protect_profile_privileged_columns
  before update on profiles
  for each row execute function protect_profile_privileged_columns();
