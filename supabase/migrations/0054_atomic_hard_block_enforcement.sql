-- The hard-block budget check (requests.ts's submitWithBudgetCheck) reads
-- committed spend, decides, then calls submit_request() as a separate
-- round-trip -- not atomic. Two concurrent submissions against the same
-- budget line, each individually under the cap at the moment it was
-- checked, could both pass and jointly blow through a hard block. This is
-- the same class of bug initiatePayment's atomic payment-status claim
-- (0037-era migration) was written to prevent -- submit_request() itself
-- just never got the same treatment.
--
-- Fix: re-enforce the hard block inside submit_request()'s own transaction,
-- locking the budget row (`for update`) so concurrent submissions against
-- the same budget serialize instead of racing. The JS-side checkBudget call
-- in requests.ts stays as-is for the fast-path UX (immediate error without
-- waiting on a round trip, and computing the soft-block "warning" banner
-- for non-hard-blocked overages) -- this makes the RPC the authoritative
-- enforcement point, matching the same principle as the payment claim.

create or replace function public.submit_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r requests%rowtype;
  total numeric(14,2);
  rule record;
  min_step int;
  first_approver uuid;
  v_budget budgets%rowtype;
  v_committed numeric;
  v_spent numeric;
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

  select * into v_budget from budgets
    where department_id = r.department_id and category = r.category
      and period_start <= current_date and period_end >= current_date
    for update;

  if v_budget is not null and v_budget.hard_block then
    select coalesce(sum(qty * est_unit_cost), 0) into v_committed
      from requests
      where department_id = r.department_id and category = r.category
        and status in ('submitted', 'under_review', 'approved')
        and id <> p_request_id;

    select coalesce(sum(po.total_amount_ngn + po.freight_cost_ngn + po.customs_duty_ngn), 0) into v_spent
      from purchase_orders po
      join requests rq on rq.id = po.request_id
      where rq.department_id = r.department_id and rq.category = r.category
        and po.status <> 'draft';

    if total > (v_budget.allocated_amount - v_committed - v_spent) then
      raise exception 'This request exceeds the remaining budget for "%" and is blocked by your Finance/Admin team.', r.category;
    end if;
  end if;

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
