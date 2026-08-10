-- The attachments bucket holds two path shapes: requests/{request_id}/... and
-- vendors/{vendor_id}/.... Scope both to the caller's organization — the
-- previous policies only checked bucket_id, so any signed-in user of any
-- organization could read or write any file in the bucket.
create or replace function object_path_org_ok(object_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  prefix text := split_part(object_name, '/', 1);
  entity_id uuid;
  org uuid;
begin
  entity_id := nullif(split_part(object_name, '/', 2), '')::uuid;
  if entity_id is null then return false; end if;

  if prefix = 'requests' then
    select organization_id into org from requests where id = entity_id;
  elsif prefix = 'vendors' then
    select organization_id into org from vendors where id = entity_id;
  else
    return false;
  end if;

  return org is not null and org = current_organization_id();
end;
$$;

drop policy attachments_insert_authenticated on storage.objects;
drop policy attachments_select_authenticated on storage.objects;

create policy attachments_insert_org on storage.objects
  for insert to authenticated with check (bucket_id = 'attachments' and object_path_org_ok(name));

create policy attachments_select_org on storage.objects
  for select to authenticated using (bucket_id = 'attachments' and object_path_org_ok(name));
