-- ProcurePro: helper functions, business-logic RPCs, and Row Level Security
-- All state-changing workflow logic lives here (SECURITY DEFINER) so the
-- frontend can never bypass role/threshold checks by writing tables directly.

-- ========== Sequences for human-readable numbers ==========
create sequence request_number_seq start 1;
create sequence po_number_seq start 1;

-- Every function below pins search_path explicitly. Without it, a SECURITY DEFINER
-- function resolves unqualified table names using the *caller's* search_path —
-- and the trigger on auth.users runs under Supabase's auth service connection,
-- whose search_path does not include "public". Omitting this causes the insert
-- into profiles to fail with an opaque "Database error creating new user".
create or replace function next_request_number()
returns text language sql set search_path = public as $$
  select 'REQ-' || lpad(nextval('request_number_seq')::text, 6, '0');
$$;

create or replace function next_po_number()
returns text language sql set search_path = public as $$
  select 'PO-' || lpad(nextval('po_number_seq')::text, 6, '0');
$$;

-- ========== Auth/profile helpers ==========
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

-- ========== Auto-create profile row when a user signs up ==========
-- Expects raw_user_meta_data: { full_name, role, department_id } set at invite time.
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

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ========== Audit log helper ==========
create or replace function write_audit(p_entity_type text, p_entity_id uuid, p_action text, p_details jsonb)
returns void language sql security definer set search_path = public as $$
  insert into audit_log (entity_type, entity_id, action, actor_id, details)
  values (p_entity_type, p_entity_id, p_action, auth.uid(), p_details);
$$;

-- ========== Notification helper ==========
create or replace function notify_user(p_user_id uuid, p_type text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, type, title, body, link)
  values (p_user_id, p_type, p_title, p_body, p_link);
$$;

-- ========== Submit a request: routes it through approval_rules thresholds ==========
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

  -- clear any stale approval rows (re-submission after rejection/info-request)
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
    -- no matching rule: fall back to a single finance_admin approval step
    insert into approvals (request_id, step_order, approver_role, status)
    values (p_request_id, 1, 'finance_admin', 'pending');
  end if;

  update requests set status = 'under_review', current_step = 1 where id = p_request_id;

  -- notify all users holding the first-step approver role
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

-- ========== Act on an approval step (approve / reject / request more info) ==========
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
  if a.status <> 'pending' then raise exception 'This approval step has already been actioned'; end if;

  select * into r from requests where id = a.request_id;

  -- Only the current step is actionable — later steps stay invisible/inert until earlier ones clear.
  if a.step_order <> r.current_step then
    raise exception 'This step is not yet active in the approval sequence';
  end if;

  -- caller must hold the required role, be an active delegate for someone who does, or be an admin
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
        where p.role = next_step.approver_role
      loop
        perform notify_user(next_approver, 'approval_needed', 'Approval needed: ' || r.request_number,
          r.description, '/requests/' || a.request_id);
      end loop;
    end if;
  end if;
end;
$$;

-- ========== Convert an approved request into a Purchase Order ==========
create or replace function convert_to_po(
  p_request_id uuid,
  p_vendor_id uuid,
  p_delivery_terms text,
  p_line_items jsonb -- [{description, qty, unit_price}, ...]
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

-- ========== Receiving: mark a PO line item received ==========
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

-- ========== Row Level Security ==========
alter table departments enable row level security;
alter table profiles enable row level security;
alter table vendors enable row level security;
alter table budgets enable row level security;
alter table approval_rules enable row level security;
alter table requests enable row level security;
alter table request_attachments enable row level security;
alter table request_comments enable row level security;
alter table approvals enable row level security;
alter table delegations enable row level security;
alter table purchase_orders enable row level security;
alter table po_line_items enable row level security;
alter table audit_log enable row level security;
alter table notifications enable row level security;

-- Departments: everyone authenticated can read; only admins write
create policy departments_select on departments for select using (auth.role() = 'authenticated');
create policy departments_write on departments for all using (is_admin_role()) with check (is_admin_role());

-- Profiles: everyone authenticated can read (needed for names in UI); self or admin can update
create policy profiles_select on profiles for select using (auth.role() = 'authenticated');
create policy profiles_update_self on profiles for update using (id = auth.uid() or is_admin_role());
create policy profiles_delete_admin on profiles for delete using (is_admin_role());

-- Vendors: read all authenticated; write by procurement/admin
create policy vendors_select on vendors for select using (auth.role() = 'authenticated');
create policy vendors_write on vendors for all using (is_procurement_or_admin()) with check (is_procurement_or_admin());

-- Budgets: read all authenticated; write by admin
create policy budgets_select on budgets for select using (auth.role() = 'authenticated');
create policy budgets_write on budgets for all using (is_admin_role()) with check (is_admin_role());

-- Approval rules: read all authenticated; write by admin
create policy approval_rules_select on approval_rules for select using (auth.role() = 'authenticated');
create policy approval_rules_write on approval_rules for all using (is_admin_role()) with check (is_admin_role());

-- Requests: requester sees own; dept members see dept requests; procurement/admin see all
create policy requests_select on requests for select using (
  requester_id = auth.uid()
  or department_id = current_department_id()
  or is_procurement_or_admin()
);
create policy requests_insert on requests for insert with check (
  requester_id = auth.uid() and department_id = current_department_id()
);
create policy requests_update on requests for update using (
  (requester_id = auth.uid() and status = 'draft')
  or is_procurement_or_admin()
);

-- Attachments/comments: visible to anyone who can see the parent request
create policy attachments_select on request_attachments for select using (
  exists (select 1 from requests r where r.id = request_id and (
    r.requester_id = auth.uid() or r.department_id = current_department_id() or is_procurement_or_admin()
  ))
);
create policy attachments_insert on request_attachments for insert with check (uploaded_by = auth.uid());

create policy comments_select on request_comments for select using (
  exists (select 1 from requests r where r.id = request_id and (
    r.requester_id = auth.uid() or r.department_id = current_department_id() or is_procurement_or_admin()
  ))
);
create policy comments_insert on request_comments for insert with check (author_id = auth.uid());

-- Approvals: visible to the assigned approver (by role), request owner, or admin
create policy approvals_select on approvals for select using (
  approver_role = current_profile_role()
  or is_admin_role()
  or exists (select 1 from requests r where r.id = request_id and r.requester_id = auth.uid())
);
-- All writes to approvals go through act_on_approval() (SECURITY DEFINER); block direct client writes.
create policy approvals_no_direct_write on approvals for all using (false) with check (false);

-- Delegations: an approver manages their own delegations; admins manage all
create policy delegations_select on delegations for select using (
  approver_id = auth.uid() or delegate_id = auth.uid() or is_admin_role()
);
create policy delegations_write on delegations for all using (
  approver_id = auth.uid() or is_admin_role()
) with check (
  approver_id = auth.uid() or is_admin_role()
);

-- Purchase orders: dept members + procurement/admin
create policy po_select on purchase_orders for select using (
  department_id = current_department_id() or is_procurement_or_admin()
);
create policy po_write on purchase_orders for all using (is_procurement_or_admin()) with check (is_procurement_or_admin());

-- PO line items: follow parent PO visibility; writes go through receive_po_line() / procurement direct edits
create policy po_line_select on po_line_items for select using (
  exists (select 1 from purchase_orders po where po.id = po_id and (
    po.department_id = current_department_id() or is_procurement_or_admin()
  ))
);
create policy po_line_write on po_line_items for all using (is_procurement_or_admin()) with check (is_procurement_or_admin());

-- Audit log: read-only, admins + procurement can view
create policy audit_select on audit_log for select using (is_procurement_or_admin());

-- Notifications: users see only their own
create policy notifications_select on notifications for select using (user_id = auth.uid());
create policy notifications_update on notifications for update using (user_id = auth.uid());

-- ========== Actionable approvals view ==========
-- Only surfaces the approval step that is currently "live" for its request
-- (step_order = requests.current_step), so later steps stay invisible until
-- earlier ones clear. security_invoker means it still runs under the caller's
-- RLS, so approvals_select continues to gate visibility per row.
create view v_actionable_approvals
with (security_invoker = true) as
select
  a.*,
  r.request_number,
  r.description,
  r.requester_id,
  r.department_id,
  r.qty,
  r.est_unit_cost
from approvals a
join requests r on r.id = a.request_id and r.current_step = a.step_order
where a.status = 'pending';
