-- Same gap as 0048 (PO amounts): lease_out_equipment never validated that
-- p_day_rate_ngn was non-negative. The RFQ-award path (award_rfq_quote ->
-- create_po_internal) is already protected by 0048; this is the one
-- remaining unprotected money field of this kind, on a separate feature
-- (equipment leasing) that doesn't route through create_po_internal at all.

create or replace function lease_out_equipment(
  p_asset_id uuid,
  p_client_name text,
  p_start_date date,
  p_expected_return_date date,
  p_day_rate_ngn numeric
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  asset equipment_assets%rowtype;
  new_lease_id uuid;
begin
  if not is_procurement_or_admin() then
    raise exception 'Only procurement officers or admins can lease out equipment';
  end if;

  if p_day_rate_ngn < 0 then raise exception 'Day rate cannot be negative'; end if;

  select * into asset from equipment_assets where id = p_asset_id;
  if asset is null or asset.organization_id <> current_organization_id() then raise exception 'Asset not found'; end if;
  if asset.status <> 'available' then
    raise exception 'Asset is not available for lease (current status: %)', asset.status;
  end if;

  insert into equipment_leases (asset_id, client_name, start_date, expected_return_date, day_rate_ngn, status, created_by)
  values (p_asset_id, p_client_name, p_start_date, p_expected_return_date, p_day_rate_ngn, 'active', auth.uid())
  returning id into new_lease_id;

  update equipment_assets set status = 'on_lease' where id = p_asset_id;

  perform write_audit('equipment_lease', new_lease_id, 'leased_out', jsonb_build_object('asset_id', p_asset_id, 'client_name', p_client_name));

  return new_lease_id;
end;
$$;
