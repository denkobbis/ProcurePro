-- submit_request() hardcoded current_step (and the first-approver notify
-- query) to 1, assuming the first materialized approval row is always
-- step_order 1. That's false whenever a request's amount only matches a
-- rule whose step_order is 2+ (e.g. approval_rules seeded with an approver
-- step capped at max_amount=500000 and a separate finance_admin step with
-- min_amount=500000 and no cap — any amount above 500000 then matches only
-- the finance_admin rule, whose step_order is 2). current_step=1 then never
-- equals any inserted approval row's step_order, so v_actionable_approvals'
-- join (r.current_step = a.step_order) never matches — the request is stuck
-- in "under_review" forever with no actionable approver for any user,
-- including admins. Fix: track and use the actual minimum step_order that
-- got inserted.

create or replace function submit_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r requests%rowtype;
  total numeric(14,2);
  rule record;
  min_step int;
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

  min_step := null;
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
    if min_step is null then
      min_step := rule.step_order;
    end if;
  end loop;

  if min_step is null then
    insert into approvals (request_id, step_order, approver_role, status)
    values (p_request_id, 1, 'finance_admin', 'pending');
    min_step := 1;
  end if;

  update requests set status = 'under_review', current_step = min_step where id = p_request_id;

  for first_approver in
    select p.id from profiles p
    join approvals a on a.approver_role = p.role
    where a.request_id = p_request_id and a.step_order = min_step and p.organization_id = r.organization_id
  loop
    perform notify_user(first_approver, 'approval_needed', 'Approval needed: ' || r.request_number,
      r.description, '/requests/' || p_request_id);
  end loop;

  perform write_audit('request', p_request_id, 'submitted', jsonb_build_object('total', total));
end;
$$;

-- Repair requests already stuck by this bug: current_step doesn't match any
-- of their pending approval rows' step_order.
update requests r
set current_step = sub.min_step
from (
  select request_id, min(step_order) as min_step
  from approvals
  where status = 'pending'
  group by request_id
) sub
where r.id = sub.request_id
  and r.status = 'under_review'
  and r.current_step <> sub.min_step;
