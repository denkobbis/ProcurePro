-- Multi-tenancy, part 3: every SECURITY DEFINER business-logic function
-- bypasses RLS, so each one needs an explicit organization check on the rows
-- it touches — a role check alone (e.g. is_procurement_or_admin()) is not
-- enough, since that's true for a matching role in ANY organization. Also
-- consolidates convert_to_po/update_po down to one signature each (the app
-- only ever called the 8-param currency-aware version; the older 4-param
-- overload was dead code left over from before the oil & gas migration).

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_org_id uuid;
  org_name text := new.raw_user_meta_data->>'create_organization_name';
  invite_org_id uuid := nullif(new.raw_user_meta_data->>'organization_id', '')::uuid;
begin
  if org_name is not null and length(trim(org_name)) > 0 then
    insert into organizations (name) values (trim(org_name)) returning id into new_org_id;
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

create or replace function submit_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r requests%rowtype;
  total numeric(14,2);
  rule record;
  step int := 1;
  first_approver uuid;
begin
  select * into r from requests where id = p_request_id;
  if r is null or r.organization_id <> current_organization_id() then raise exception 'Request not found'; end if;
  if r.requester_id <> auth.uid() and not is_admin_role() then
    raise exception 'Not authorized to submit this request';
  end if;
  if r.status <> 'draft' then
    raise exception 'Only draft requests can be submitted';
  end if;

  total := r.qty * r.est_unit_cost;

  delete from approvals where request_id = p_request_id;

  for rule in
    select * from approval_rules
    where organization_id = r.organization_id
      and (department_id = r.department_id or department_id is null)
      and min_amount <= total
      and (max_amount is null or max_amount >= total)
    order by step_order asc
  loop
    insert into approvals (request_id, step_order, approver_role, status)
    values (p_request_id, rule.step_order, rule.approver_role, 'pending');
    step := rule.step_order;
  end loop;

  if not found then
    insert into approvals (request_id, step_order, approver_role, status)
    values (p_request_id, 1, 'finance_admin', 'pending');
  end if;

  update requests set status = 'under_review', current_step = 1 where id = p_request_id;

  for first_approver in
    select p.id from profiles p
    join approvals a on a.approver_role = p.role
    where a.request_id = p_request_id and a.step_order = 1 and p.organization_id = r.organization_id
  loop
    perform notify_user(first_approver, 'approval_needed', 'Approval needed: ' || r.request_number,
      r.description, '/requests/' || p_request_id);
  end loop;

  perform write_audit('request', p_request_id, 'submitted', jsonb_build_object('total', total));
end;
$$;

create or replace function act_on_approval(p_approval_id uuid, p_action approval_status, p_comment text)
returns void language plpgsql security definer set search_path = public as $$
declare
  a approvals%rowtype;
  r requests%rowtype;
  next_step record;
  requester uuid;
  next_approver uuid;
begin
  select * into a from approvals where id = p_approval_id;
  if a is null then raise exception 'Approval step not found'; end if;

  select * into r from requests where id = a.request_id;
  if r is null or r.organization_id <> current_organization_id() then raise exception 'Approval step not found'; end if;

  if a.status <> 'pending' then raise exception 'This approval step has already been actioned'; end if;
  if a.step_order <> r.current_step then
    raise exception 'This step is not yet active in the approval sequence';
  end if;

  if current_profile_role() <> a.approver_role
     and not is_admin_role()
     and not exists (
       select 1 from delegations d
       join profiles p on p.id = d.approver_id
       where p.role = a.approver_role
         and d.delegate_id = auth.uid()
         and d.organization_id = r.organization_id
         and current_date between d.start_date and d.end_date
     )
  then
    raise exception 'You do not hold the required approver role for this step';
  end if;

  if p_action not in ('approved', 'rejected', 'info_requested') then
    raise exception 'Invalid action';
  end if;

  update approvals
    set status = p_action, comment = p_comment, acted_at = now(), approver_id = auth.uid()
    where id = p_approval_id;

  perform write_audit('approval', p_approval_id, p_action::text, jsonb_build_object('comment', p_comment));

  if p_action = 'rejected' then
    update requests set status = 'rejected' where id = a.request_id;
    select requester_id into requester from requests where id = a.request_id;
    perform notify_user(requester, 'request_rejected', 'Request rejected: ' || r.request_number, p_comment, '/requests/' || a.request_id);
  elsif p_action = 'info_requested' then
    update requests set status = 'draft' where id = a.request_id;
    select requester_id into requester from requests where id = a.request_id;
    perform notify_user(requester, 'info_requested', 'More info needed: ' || r.request_number, p_comment, '/requests/' || a.request_id);
  elsif p_action = 'approved' then
    select * into next_step from approvals
      where request_id = a.request_id and step_order = a.step_order + 1;
    if next_step is null then
      update requests set status = 'approved' where id = a.request_id;
      select requester_id into requester from requests where id = a.request_id;
      perform notify_user(requester, 'request_approved', 'Request approved: ' || r.request_number, null, '/requests/' || a.request_id);
    else
      update requests set current_step = next_step.step_order where id = a.request_id;
      for next_approver in
        select p.id from profiles p
        where p.role = next_step.approver_role and p.organization_id = r.organization_id
      loop
        perform notify_user(next_approver, 'approval_needed', 'Approval needed: ' || r.request_number,
          r.description, '/requests/' || a.request_id);
      end loop;
    end if;
  end if;
end;
$$;

create or replace function create_po_internal(
  p_request_id uuid, p_vendor_id uuid, p_delivery_terms text, p_line_items jsonb,
  p_currency currency_code, p_fx_rate_to_ngn numeric, p_freight_cost_ngn numeric, p_customs_duty_ngn numeric
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
  if r is null or r.organization_id <> current_organization_id() then raise exception 'Request not found'; end if;
  if r.status <> 'approved' then raise exception 'Only approved requests can be converted to a PO'; end if;

  select * into v from vendors where id = p_vendor_id;
  if v is null or v.organization_id <> r.organization_id then raise exception 'Vendor not found'; end if;

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

drop function if exists convert_to_po(uuid, uuid, text, jsonb);
drop function if exists update_po(uuid, uuid, text, jsonb);
drop function if exists convert_to_po(uuid, uuid, text, jsonb, currency_code, numeric, numeric, numeric);
drop function if exists update_po(uuid, uuid, text, jsonb, currency_code, numeric, numeric, numeric);

create or replace function convert_to_po(
  p_request_id uuid, p_vendor_id uuid, p_delivery_terms text, p_line_items jsonb,
  p_currency currency_code default 'NGN'::currency_code, p_fx_rate_to_ngn numeric default 1,
  p_freight_cost_ngn numeric default 0, p_customs_duty_ngn numeric default 0
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

create or replace function update_po(
  p_po_id uuid, p_vendor_id uuid, p_delivery_terms text, p_line_items jsonb,
  p_currency currency_code default 'NGN'::currency_code, p_fx_rate_to_ngn numeric default 1,
  p_freight_cost_ngn numeric default 0, p_customs_duty_ngn numeric default 0
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

create or replace function mark_po_in_transit(p_po_id uuid, p_carrier text, p_tracking_number text, p_eta date)
returns void language plpgsql security definer set search_path = public as $$
declare
  po purchase_orders%rowtype;
begin
  if not is_procurement_or_admin() then
    raise exception 'Only procurement officers or admins can update shipping status';
  end if;

  select * into po from purchase_orders where id = p_po_id;
  if po is null or po.organization_id <> current_organization_id() then raise exception 'Purchase order not found'; end if;
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
  if po is null or po.organization_id <> current_organization_id() then raise exception 'Purchase order not found'; end if;
  if po.status not in ('sent_to_vendor', 'in_transit') then
    raise exception 'Only a PO that has been sent or is in transit can be cleared through customs';
  end if;

  update purchase_orders
    set status = 'customs_clearance', customs_reference = p_customs_reference, customs_cleared_at = now()
    where id = p_po_id;

  perform write_audit('purchase_order', p_po_id, 'customs_cleared', jsonb_build_object('customs_reference', p_customs_reference));
end;
$$;

create or replace function receive_po_line(p_line_item_id uuid, p_received_qty numeric, p_quality_pass boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  li po_line_items%rowtype;
  po_org uuid;
  p_id uuid;
  all_received boolean;
  any_received boolean;
begin
  if not is_procurement_or_admin() then
    raise exception 'Only procurement officers or admins can record receiving';
  end if;

  select * into li from po_line_items where id = p_line_item_id;
  if li is null then raise exception 'Line item not found'; end if;

  select organization_id into po_org from purchase_orders where id = li.po_id;
  if po_org is null or po_org <> current_organization_id() then raise exception 'Line item not found'; end if;

  update po_line_items
    set received_qty = least(li.qty, li.received_qty + p_received_qty),
        quality_pass = p_quality_pass
    where id = p_line_item_id;

  p_id := li.po_id;

  select bool_and(received_qty >= qty), bool_or(received_qty > 0)
    into all_received, any_received
    from po_line_items where po_id = p_id;

  update purchase_orders
    set status = case when all_received then 'fully_received'
                       when any_received then 'partially_received'
                       else status end
    where id = p_id;

  perform write_audit('po_line_item', p_line_item_id, 'received', jsonb_build_object('qty', p_received_qty, 'quality_pass', p_quality_pass));
end;
$$;

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
  if r is null or r.organization_id <> current_organization_id() then raise exception 'Request not found'; end if;
  if r.status <> 'approved' then raise exception 'Only approved requests can go out for quotes'; end if;

  insert into rfqs (request_id, created_by) values (p_request_id, auth.uid())
  returning id into new_rfq_id;

  perform write_audit('rfq', new_rfq_id, 'created', jsonb_build_object('request_id', p_request_id));

  return new_rfq_id;
end;
$$;

create or replace function add_rfq_quote(p_rfq_id uuid, p_vendor_id uuid, p_unit_price numeric, p_currency currency_code, p_lead_time_days integer, p_notes text)
returns void language plpgsql security definer set search_path = public as $$
declare
  rfq rfqs%rowtype;
  rfq_org uuid;
  vendor_org uuid;
begin
  if not is_procurement_or_admin() then
    raise exception 'Only procurement officers or admins can add quotes';
  end if;

  select * into rfq from rfqs where id = p_rfq_id;
  if rfq is null then raise exception 'RFQ not found'; end if;

  select r.organization_id into rfq_org from requests r where r.id = rfq.request_id;
  if rfq_org is null or rfq_org <> current_organization_id() then raise exception 'RFQ not found'; end if;

  select organization_id into vendor_org from vendors where id = p_vendor_id;
  if vendor_org is null or vendor_org <> rfq_org then raise exception 'Vendor not found'; end if;

  if rfq.status <> 'open' then raise exception 'This RFQ is no longer open for quotes'; end if;

  insert into rfq_quotes (rfq_id, vendor_id, unit_price, currency, lead_time_days, notes, created_by)
  values (p_rfq_id, p_vendor_id, p_unit_price, p_currency, p_lead_time_days, p_notes, auth.uid())
  on conflict (rfq_id, vendor_id) do update
    set unit_price = excluded.unit_price, currency = excluded.currency,
        lead_time_days = excluded.lead_time_days, notes = excluded.notes;
end;
$$;

create or replace function award_rfq_quote(p_quote_id uuid, p_delivery_terms text, p_fx_rate_to_ngn numeric, p_freight_cost_ngn numeric, p_customs_duty_ngn numeric)
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
  if rfq is null then raise exception 'RFQ not found'; end if;

  select * into r from requests where id = rfq.request_id;
  if r is null or r.organization_id <> current_organization_id() then raise exception 'RFQ not found'; end if;

  if rfq.status <> 'open' then raise exception 'This RFQ has already been awarded or cancelled'; end if;

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

create or replace function lease_out_equipment(p_asset_id uuid, p_client_name text, p_start_date date, p_expected_return_date date, p_day_rate_ngn numeric)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  asset equipment_assets%rowtype;
  new_lease_id uuid;
begin
  if not is_procurement_or_admin() then
    raise exception 'Only procurement officers or admins can lease out equipment';
  end if;

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

create or replace function mark_equipment_returned(p_lease_id uuid, p_return_condition text, p_inspection_pass boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  lease equipment_leases%rowtype;
  lease_org uuid;
begin
  if not is_procurement_or_admin() then
    raise exception 'Only procurement officers or admins can record equipment returns';
  end if;

  select * into lease from equipment_leases where id = p_lease_id;
  if lease is null then raise exception 'Lease not found'; end if;

  select organization_id into lease_org from equipment_assets where id = lease.asset_id;
  if lease_org is null or lease_org <> current_organization_id() then raise exception 'Lease not found'; end if;

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
