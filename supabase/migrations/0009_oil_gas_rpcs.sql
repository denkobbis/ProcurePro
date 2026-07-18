-- RPC functions for the oil & gas procurement additions (see 0008 for schema).
-- Run this AFTER 0008 has been committed — it references the new po_status
-- enum values ('in_transit', 'customs_clearance'), which per Postgres rules
-- can't be used in the same transaction that added them.

-- ========== Shared PO-creation helper (used by convert_to_po and award_rfq_quote) ==========
create or replace function create_po_internal(
  p_request_id uuid,
  p_vendor_id uuid,
  p_delivery_terms text,
  p_line_items jsonb, -- [{description, qty, unit_price, mpn, oem_brand}, ...]
  p_currency currency_code,
  p_fx_rate_to_ngn numeric,
  p_freight_cost_ngn numeric,
  p_customs_duty_ngn numeric
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  r requests%rowtype;
  v vendors%rowtype;
  new_po_id uuid;
  item jsonb;
  total numeric(14,2) := 0;
begin
  select * into r from requests where id = p_request_id;
  if r is null then raise exception 'Request not found'; end if;
  if r.status <> 'approved' then raise exception 'Only approved requests can be converted to a PO'; end if;

  select * into v from vendors where id = p_vendor_id;
  if v is null then raise exception 'Vendor not found'; end if;

  insert into purchase_orders (
    po_number, request_id, vendor_id, department_id, status, delivery_terms, created_by,
    currency, fx_rate_to_ngn, freight_cost_ngn, customs_duty_ngn,
    local_content_percentage, ncdmb_certificate_number
  )
  values (
    next_po_number(), p_request_id, p_vendor_id, r.department_id, 'draft', p_delivery_terms, auth.uid(),
    p_currency, p_fx_rate_to_ngn, p_freight_cost_ngn, p_customs_duty_ngn,
    v.local_content_percentage, v.ncdmb_certificate_number
  )
  returning id into new_po_id;

  for item in select * from jsonb_array_elements(p_line_items)
  loop
    insert into po_line_items (po_id, description, qty, unit_price, mpn, oem_brand)
    values (
      new_po_id, item->>'description', (item->>'qty')::numeric, (item->>'unit_price')::numeric,
      nullif(item->>'mpn', ''), nullif(item->>'oem_brand', '')
    );
    total := total + (item->>'qty')::numeric * (item->>'unit_price')::numeric;
  end loop;

  update purchase_orders
    set total_amount = total, total_amount_ngn = total * p_fx_rate_to_ngn
    where id = new_po_id;

  update requests set status = 'converted_to_po' where id = p_request_id;

  perform write_audit('purchase_order', new_po_id, 'created', jsonb_build_object('request_id', p_request_id, 'total_amount_ngn', total * p_fx_rate_to_ngn));

  return new_po_id;
end;
$$;

-- ========== Replaces the original convert_to_po with currency/landed-cost/MPN support ==========
create or replace function convert_to_po(
  p_request_id uuid,
  p_vendor_id uuid,
  p_delivery_terms text,
  p_line_items jsonb,
  p_currency currency_code default 'NGN',
  p_fx_rate_to_ngn numeric default 1,
  p_freight_cost_ngn numeric default 0,
  p_customs_duty_ngn numeric default 0
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_po_id uuid;
begin
  if not is_procurement_or_admin() then
    raise exception 'Only procurement officers or admins can create purchase orders';
  end if;

  select create_po_internal(
    p_request_id, p_vendor_id, p_delivery_terms, p_line_items,
    p_currency, p_fx_rate_to_ngn, p_freight_cost_ngn, p_customs_duty_ngn
  ) into new_po_id;

  return new_po_id;
end;
$$;

-- ========== Replaces update_po with currency/landed-cost/MPN support ==========
create or replace function update_po(
  p_po_id uuid,
  p_vendor_id uuid,
  p_delivery_terms text,
  p_line_items jsonb,
  p_currency currency_code default 'NGN',
  p_fx_rate_to_ngn numeric default 1,
  p_freight_cost_ngn numeric default 0,
  p_customs_duty_ngn numeric default 0
)
returns void language plpgsql security definer set search_path = public as $$
declare
  po purchase_orders%rowtype;
  v vendors%rowtype;
  before_snapshot jsonb;
  item jsonb;
  total numeric(14,2) := 0;
begin
  if not is_procurement_or_admin() then
    raise exception 'Only procurement officers or admins can edit purchase orders';
  end if;

  select * into po from purchase_orders where id = p_po_id;
  if po is null then raise exception 'Purchase order not found'; end if;
  if po.status <> 'draft' then
    raise exception 'Only draft purchase orders can be edited';
  end if;

  select * into v from vendors where id = p_vendor_id;
  if v is null then raise exception 'Vendor not found'; end if;

  before_snapshot := jsonb_build_object(
    'vendor_id', po.vendor_id,
    'delivery_terms', po.delivery_terms,
    'total_amount', po.total_amount,
    'total_amount_ngn', po.total_amount_ngn,
    'currency', po.currency,
    'line_items', (select coalesce(jsonb_agg(jsonb_build_object('description', description, 'qty', qty, 'unit_price', unit_price, 'mpn', mpn, 'oem_brand', oem_brand)), '[]'::jsonb)
                    from po_line_items where po_id = p_po_id)
  );

  delete from po_line_items where po_id = p_po_id;

  for item in select * from jsonb_array_elements(p_line_items)
  loop
    insert into po_line_items (po_id, description, qty, unit_price, mpn, oem_brand)
    values (
      p_po_id, item->>'description', (item->>'qty')::numeric, (item->>'unit_price')::numeric,
      nullif(item->>'mpn', ''), nullif(item->>'oem_brand', '')
    );
    total := total + (item->>'qty')::numeric * (item->>'unit_price')::numeric;
  end loop;

  update purchase_orders
    set vendor_id = p_vendor_id,
        delivery_terms = p_delivery_terms,
        total_amount = total,
        currency = p_currency,
        fx_rate_to_ngn = p_fx_rate_to_ngn,
        total_amount_ngn = total * p_fx_rate_to_ngn,
        freight_cost_ngn = p_freight_cost_ngn,
        customs_duty_ngn = p_customs_duty_ngn,
        local_content_percentage = v.local_content_percentage,
        ncdmb_certificate_number = v.ncdmb_certificate_number
    where id = p_po_id;

  perform write_audit('purchase_order', p_po_id, 'edited', jsonb_build_object(
    'before', before_snapshot,
    'after', jsonb_build_object('vendor_id', p_vendor_id, 'delivery_terms', p_delivery_terms, 'total_amount_ngn', total * p_fx_rate_to_ngn, 'currency', p_currency, 'line_items', p_line_items)
  ));
end;
$$;

-- ========== Shipping / customs stage transitions ==========
create or replace function mark_po_in_transit(p_po_id uuid, p_carrier text, p_tracking_number text, p_eta date)
returns void language plpgsql security definer set search_path = public as $$
declare
  po purchase_orders%rowtype;
begin
  if not is_procurement_or_admin() then
    raise exception 'Only procurement officers or admins can update shipping status';
  end if;

  select * into po from purchase_orders where id = p_po_id;
  if po is null then raise exception 'Purchase order not found'; end if;
  if po.status <> 'sent_to_vendor' then
    raise exception 'Only a PO already sent to the vendor can be marked in transit';
  end if;

  update purchase_orders
    set status = 'in_transit', carrier = p_carrier, tracking_number = p_tracking_number, eta = p_eta
    where id = p_po_id;

  perform write_audit('purchase_order', p_po_id, 'in_transit', jsonb_build_object('carrier', p_carrier, 'tracking_number', p_tracking_number, 'eta', p_eta));
end;
$$;

create or replace function mark_po_customs_cleared(p_po_id uuid, p_customs_reference text)
returns void language plpgsql security definer set search_path = public as $$
declare
  po purchase_orders%rowtype;
begin
  if not is_procurement_or_admin() then
    raise exception 'Only procurement officers or admins can update customs status';
  end if;

  select * into po from purchase_orders where id = p_po_id;
  if po is null then raise exception 'Purchase order not found'; end if;
  if po.status not in ('sent_to_vendor', 'in_transit') then
    raise exception 'Only a PO that has been sent or is in transit can be cleared through customs';
  end if;

  update purchase_orders
    set status = 'customs_clearance', customs_reference = p_customs_reference, customs_cleared_at = now()
    where id = p_po_id;

  perform write_audit('purchase_order', p_po_id, 'customs_cleared', jsonb_build_object('customs_reference', p_customs_reference));
end;
$$;

-- ========== Equipment leasing ==========
create or replace function lease_out_equipment(
  p_asset_id uuid, p_client_name text, p_start_date date, p_expected_return_date date, p_day_rate_ngn numeric
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  asset equipment_assets%rowtype;
  new_lease_id uuid;
begin
  if not is_procurement_or_admin() then
    raise exception 'Only procurement officers or admins can lease out equipment';
  end if;

  select * into asset from equipment_assets where id = p_asset_id;
  if asset is null then raise exception 'Asset not found'; end if;
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

-- ========== RFQ / multi-vendor quote comparison ==========
create or replace function create_rfq(p_request_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  r requests%rowtype;
  new_rfq_id uuid;
begin
  if not is_procurement_or_admin() then
    raise exception 'Only procurement officers or admins can create an RFQ';
  end if;

  select * into r from requests where id = p_request_id;
  if r is null then raise exception 'Request not found'; end if;
  if r.status <> 'approved' then raise exception 'Only approved requests can go out for quotes'; end if;

  insert into rfqs (request_id, created_by) values (p_request_id, auth.uid())
  returning id into new_rfq_id;

  perform write_audit('rfq', new_rfq_id, 'created', jsonb_build_object('request_id', p_request_id));

  return new_rfq_id;
end;
$$;

create or replace function add_rfq_quote(
  p_rfq_id uuid, p_vendor_id uuid, p_unit_price numeric, p_currency currency_code, p_lead_time_days int, p_notes text
)
returns void language plpgsql security definer set search_path = public as $$
declare
  rfq rfqs%rowtype;
begin
  if not is_procurement_or_admin() then
    raise exception 'Only procurement officers or admins can add quotes';
  end if;

  select * into rfq from rfqs where id = p_rfq_id;
  if rfq is null then raise exception 'RFQ not found'; end if;
  if rfq.status <> 'open' then raise exception 'This RFQ is no longer open for quotes'; end if;

  insert into rfq_quotes (rfq_id, vendor_id, unit_price, currency, lead_time_days, notes, created_by)
  values (p_rfq_id, p_vendor_id, p_unit_price, p_currency, p_lead_time_days, p_notes, auth.uid())
  on conflict (rfq_id, vendor_id) do update
    set unit_price = excluded.unit_price, currency = excluded.currency,
        lead_time_days = excluded.lead_time_days, notes = excluded.notes;
end;
$$;

create or replace function award_rfq_quote(
  p_quote_id uuid, p_delivery_terms text, p_fx_rate_to_ngn numeric, p_freight_cost_ngn numeric, p_customs_duty_ngn numeric
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  quote rfq_quotes%rowtype;
  rfq rfqs%rowtype;
  r requests%rowtype;
  new_po_id uuid;
  line_items jsonb;
begin
  if not is_procurement_or_admin() then
    raise exception 'Only procurement officers or admins can award an RFQ';
  end if;

  select * into quote from rfq_quotes where id = p_quote_id;
  if quote is null then raise exception 'Quote not found'; end if;

  select * into rfq from rfqs where id = quote.rfq_id;
  if rfq.status <> 'open' then raise exception 'This RFQ has already been awarded or cancelled'; end if;

  select * into r from requests where id = rfq.request_id;

  line_items := jsonb_build_array(jsonb_build_object(
    'description', r.description, 'qty', r.qty, 'unit_price', quote.unit_price,
    'mpn', r.mpn, 'oem_brand', r.oem_brand
  ));

  select create_po_internal(
    rfq.request_id, quote.vendor_id, p_delivery_terms, line_items,
    quote.currency, p_fx_rate_to_ngn, p_freight_cost_ngn, p_customs_duty_ngn
  ) into new_po_id;

  update rfq_quotes set is_winner = true where id = p_quote_id;
  update rfqs set status = 'awarded' where id = quote.rfq_id;

  perform write_audit('rfq', rfq.id, 'awarded', jsonb_build_object('quote_id', p_quote_id, 'vendor_id', quote.vendor_id, 'po_id', new_po_id));

  return new_po_id;
end;
$$;
