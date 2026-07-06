-- Fixes "Database error creating new user" on signup.
--
-- Root cause: none of our functions pinned search_path, so the SECURITY DEFINER
-- trigger on auth.users resolved unqualified table names (profiles, etc.) using
-- the auth service's connection search_path, which doesn't include "public".
-- The insert into profiles failed, the whole auth.users insert rolled back, and
-- GoTrue surfaced it as an opaque 500 "Database error creating new user".
--
-- This migration is CREATE OR REPLACE only — safe to run on top of 0002.
-- (If you're bootstrapping fresh, 0002_functions_rls.sql already has the fix
-- and this file is a no-op.)

create or replace function next_request_number()
returns text language sql set search_path = public as $$
  select 'REQ-' || lpad(nextval('request_number_seq')::text, 6, '0');
$$;

create or replace function next_po_number()
returns text language sql set search_path = public as $$
  select 'PO-' || lpad(nextval('po_number_seq')::text, 6, '0');
$$;

create or replace function current_profile_role()
returns user_role language sql stable set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function current_department_id()
returns uuid language sql stable set search_path = public as $$
  select department_id from profiles where id = auth.uid();
$$;

create or replace function is_admin_role()
returns boolean language sql stable set search_path = public as $$
  select current_profile_role() in ('finance_admin', 'super_admin');
$$;

create or replace function is_procurement_or_admin()
returns boolean language sql stable set search_path = public as $$
  select current_profile_role() in ('procurement_officer', 'finance_admin', 'super_admin');
$$;

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email, role, department_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'requester'),
    nullif(new.raw_user_meta_data->>'department_id', '')::uuid
  );
  return new;
end;
$$;

create or replace function write_audit(p_entity_type text, p_entity_id uuid, p_action text, p_details jsonb)
returns void language sql security definer set search_path = public as $$
  insert into audit_log (entity_type, entity_id, action, actor_id, details)
  values (p_entity_type, p_entity_id, p_action, auth.uid(), p_details);
$$;

create or replace function notify_user(p_user_id uuid, p_type text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, type, title, body, link)
  values (p_user_id, p_type, p_title, p_body, p_link);
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
  if r is null then raise exception 'Request not found'; end if;
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
    where (department_id = r.department_id or department_id is null)
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
    where a.request_id = p_request_id and a.step_order = 1
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
begin
  select * into a from approvals where id = p_approval_id;
  if a is null then raise exception 'Approval step not found'; end if;
  if a.status <> 'pending' then raise exception 'This approval step has already been actioned'; end if;

  select * into r from requests where id = a.request_id;

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
  elsif p_action = 'info_requested' then
    update requests set status = 'draft' where id = a.request_id;
  elsif p_action = 'approved' then
    select * into next_step from approvals
      where request_id = a.request_id and step_order = a.step_order + 1;
    if next_step is null then
      update requests set status = 'approved' where id = a.request_id;
      select requester_id into requester from requests where id = a.request_id;
      perform notify_user(requester, 'request_approved', 'Request approved: ' || r.request_number, null, '/requests/' || a.request_id);
    else
      update requests set current_step = next_step.step_order where id = a.request_id;
    end if;
  end if;
end;
$$;

create or replace function convert_to_po(
  p_request_id uuid,
  p_vendor_id uuid,
  p_delivery_terms text,
  p_line_items jsonb
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  r requests%rowtype;
  new_po_id uuid;
  item jsonb;
  total numeric(14,2) := 0;
begin
  if not is_procurement_or_admin() then
    raise exception 'Only procurement officers or admins can create purchase orders';
  end if;

  select * into r from requests where id = p_request_id;
  if r is null then raise exception 'Request not found'; end if;
  if r.status <> 'approved' then raise exception 'Only approved requests can be converted to a PO'; end if;

  insert into purchase_orders (po_number, request_id, vendor_id, department_id, status, delivery_terms, created_by)
  values (next_po_number(), p_request_id, p_vendor_id, r.department_id, 'draft', p_delivery_terms, auth.uid())
  returning id into new_po_id;

  for item in select * from jsonb_array_elements(p_line_items)
  loop
    insert into po_line_items (po_id, description, qty, unit_price)
    values (new_po_id, item->>'description', (item->>'qty')::numeric, (item->>'unit_price')::numeric);
    total := total + (item->>'qty')::numeric * (item->>'unit_price')::numeric;
  end loop;

  update purchase_orders set total_amount = total where id = new_po_id;
  update requests set status = 'converted_to_po' where id = p_request_id;

  perform write_audit('purchase_order', new_po_id, 'created', jsonb_build_object('request_id', p_request_id, 'total', total));

  return new_po_id;
end;
$$;

create or replace function receive_po_line(p_line_item_id uuid, p_received_qty numeric, p_quality_pass boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  li po_line_items%rowtype;
  p_id uuid;
  all_received boolean;
  any_received boolean;
begin
  if not is_procurement_or_admin() then
    raise exception 'Only procurement officers or admins can record receiving';
  end if;

  select * into li from po_line_items where id = p_line_item_id;
  if li is null then raise exception 'Line item not found'; end if;

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
