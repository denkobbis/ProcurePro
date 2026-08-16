-- Allow "purchase_orders/{po_id}/..." storage paths (used for vendor invoice
-- uploads) alongside the existing "requests"/"vendors" prefixes.
CREATE OR REPLACE FUNCTION public.object_path_org_ok(object_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  elsif prefix = 'purchase_orders' then
    select organization_id into org from purchase_orders where id = entity_id;
  else
    return false;
  end if;

  return org is not null and org = current_organization_id();
end;
$function$
