-- Fixes "column status is of type equipment_status but expression is of type
-- text" when marking equipment returned.
--
-- Root cause: `case when p_inspection_pass then 'available' else 'maintenance'
-- end` has no branch referencing an already-typed column, so Postgres
-- resolves both string literals as plain `text` instead of leaving them as
-- untyped constants that would auto-coerce to the target enum. An explicit
-- cast fixes it. (receive_po_line's similar CASE is unaffected — its `else
-- status` branch anchors the whole expression to the po_status enum already.)
--
-- CREATE OR REPLACE only — safe to run on top of 0009.

create or replace function mark_equipment_returned(p_lease_id uuid, p_return_condition text, p_inspection_pass boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  lease equipment_leases%rowtype;
begin
  if not is_procurement_or_admin() then
    raise exception 'Only procurement officers or admins can record equipment returns';
  end if;

  select * into lease from equipment_leases where id = p_lease_id;
  if lease is null then raise exception 'Lease not found'; end if;
  if lease.status <> 'active' then raise exception 'This lease has already been closed out'; end if;

  update equipment_leases
    set status = 'returned', actual_return_date = current_date, return_condition = p_return_condition, return_inspection_pass = p_inspection_pass
    where id = p_lease_id;

  update equipment_assets
    set status = (case when p_inspection_pass then 'available' else 'maintenance' end)::equipment_status
    where id = lease.asset_id;

  perform write_audit('equipment_lease', p_lease_id, 'returned', jsonb_build_object('condition', p_return_condition, 'inspection_pass', p_inspection_pass));
end;
$$;
