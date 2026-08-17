-- Three RPCs read a row's status, do other work, then act on that status
-- without holding a lock across the check — the same TOCTOU pattern already
-- fixed on the payments side (initiatePayment, app-layer). Two concurrent
-- calls can both pass the "still pending/open/approved" check before either
-- commits. `for update` locks the row at the initial read, so Postgres
-- serializes concurrent callers: the second one blocks until the first
-- commits, then re-reads the now-updated row and correctly fails its guard.

-- award_rfq_quote / create_po_internal: two concurrent awards (or an award
-- racing a direct convert_to_po) could each create a purchase order for the
-- same RFQ/request — a duplicate real financial commitment.
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
  select * into r from requests where id = p_request_id for update;
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

  select * into rfq from rfqs where id = quote.rfq_id for update;
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

-- act_on_approval: the final UPDATE had no WHERE status = 'pending' guard,
-- so two concurrent actions on the same approval (a double-click, or an
-- approver and their delegate acting near-simultaneously) could both pass
-- the "still pending" check and both apply — the second silently overwrites
-- the first's decision and re-runs the downstream branch a second time.
create or replace function act_on_approval(p_approval_id uuid, p_action approval_status, p_comment text)
returns void language plpgsql security definer set search_path = public as $$
declare
  a approvals%rowtype;
  r requests%rowtype;
  next_step record;
  requester uuid;
  next_approver uuid;
begin
  select * into a from approvals where id = p_approval_id for update;
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
