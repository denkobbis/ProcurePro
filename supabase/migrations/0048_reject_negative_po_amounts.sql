-- Neither the app layer nor these RPCs validated that PO line-item qty/
-- unit_price, freight_cost_ngn, customs_duty_ngn, or fx_rate_to_ngn were
-- non-negative. A procurement_officer/finance_admin/super_admin (a
-- legitimately privileged role, but one whose account could be
-- compromised, or simply fat-fingered) could set a negative unit_price or
-- negative freight/customs cost, producing an artificially low or even
-- negative total_amount_ngn -- corrupting budget "spent" tracking, landed-
-- cost reports, and payment remaining-balance math, and specifically
-- evading the price-jump anomaly check in po-anomaly.ts (which only looks
-- for unusually HIGH amounts, not manipulated-low ones).

create or replace function create_po_internal(
  p_request_id uuid,
  p_vendor_id uuid,
  p_delivery_terms text,
  p_line_items jsonb,
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
  select * into r from requests where id = p_request_id for update;
  if r is null or r.organization_id <> current_organization_id() then raise exception 'Request not found'; end if;
  if r.status <> 'approved' then raise exception 'Only approved requests can be converted to a PO'; end if;

  select * into v from vendors where id = p_vendor_id;
  if v is null or v.organization_id <> r.organization_id then raise exception 'Vendor not found'; end if;

  if p_fx_rate_to_ngn <= 0 then raise exception 'FX rate must be positive'; end if;
  if p_freight_cost_ngn < 0 then raise exception 'Freight cost cannot be negative'; end if;
  if p_customs_duty_ngn < 0 then raise exception 'Customs duty cannot be negative'; end if;

  insert into purchase_orders (
    po_number, request_id, vendor_id, department_id, organization_id, status, delivery_terms, created_by,
    currency, fx_rate_to_ngn, freight_cost_ngn, customs_duty_ngn,
    local_content_percentage, ncdmb_certificate_number
  )
  values (
    next_po_number(), p_request_id, p_vendor_id, r.department_id, r.organization_id, 'draft', p_delivery_terms, auth.uid(),
    p_currency, p_fx_rate_to_ngn, p_freight_cost_ngn, p_customs_duty_ngn,
    v.local_content_percentage, v.ncdmb_certificate_number
  )
  returning id into new_po_id;

  for item in select * from jsonb_array_elements(p_line_items)
  loop
    if (item->>'qty')::numeric <= 0 then raise exception 'Line item quantity must be positive'; end if;
    if (item->>'unit_price')::numeric < 0 then raise exception 'Line item unit price cannot be negative'; end if;

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

create or replace function update_po(
  p_po_id uuid,
  p_vendor_id uuid,
  p_delivery_terms text,
  p_line_items jsonb,
  p_currency currency_code default 'NGN'::currency_code,
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
  if po is null or po.organization_id <> current_organization_id() then raise exception 'Purchase order not found'; end if;
  if po.status <> 'draft' then
    raise exception 'Only draft purchase orders can be edited';
  end if;

  select * into v from vendors where id = p_vendor_id;
  if v is null or v.organization_id <> po.organization_id then raise exception 'Vendor not found'; end if;

  if p_fx_rate_to_ngn <= 0 then raise exception 'FX rate must be positive'; end if;
  if p_freight_cost_ngn < 0 then raise exception 'Freight cost cannot be negative'; end if;
  if p_customs_duty_ngn < 0 then raise exception 'Customs duty cannot be negative'; end if;

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
    if (item->>'qty')::numeric <= 0 then raise exception 'Line item quantity must be positive'; end if;
    if (item->>'unit_price')::numeric < 0 then raise exception 'Line item unit price cannot be negative'; end if;

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
