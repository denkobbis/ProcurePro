-- Three real gaps found in an approval-workflow audit:
--
-- 1. Multi-approver steps silently collapsed to "first approver wins" —
--    nothing stopped two approval_rules sharing a step_order (e.g. "step 2
--    needs both finance_admin AND super_admin"), but act_on_approval only
--    checked for a row at step_order + 1, never whether a SIBLING approval
--    at the same step was still pending. Whoever acted first either
--    advanced the request or marked it fully approved, orphaning the other
--    required sign-off.
--
-- 2. Self-approval was possible whenever a requester's own role matched a
--    step's required role (e.g. a finance_admin submitting their own
--    request, routed to a finance_admin step). The role check never
--    compared against the request's own requester_id.
--
-- 3. requests_update RLS let any procurement_officer/finance_admin/
--    super_admin update ANY column on ANY request directly (no status-
--    transition guard), unlike the requester's own branch which is
--    correctly locked to status = 'draft'. No app code actually uses this
--    (every real status change goes through a security-definer RPC, which
--    bypasses RLS entirely as the table owner) — it was pure unused attack
--    surface reachable via a direct client call using a real session.

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

  -- Segregation of duties: never let the requester act on their own
  -- request's approval, even if their role happens to match the step
  -- (and even for admins — they hold the most purchasing power, so they
  -- need the check more than anyone, not less).
  if r.requester_id = auth.uid() then
    raise exception 'You cannot act on your own request — ask another approver to review it';
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
    if exists (
      select 1 from approvals
      where request_id = a.request_id and step_order = a.step_order and status = 'pending'
    ) then
      -- A sibling approval at this same step is still pending (two rules
      -- sharing a step_order — dual sign-off). Nothing advances until every
      -- approval at this step has been actioned.
      null;
    else
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
  end if;
end;
$$;

drop policy requests_update on requests;
create policy requests_update on requests for update using (
  organization_id = current_organization_id()
  and requester_id = auth.uid() and status = 'draft'
);
