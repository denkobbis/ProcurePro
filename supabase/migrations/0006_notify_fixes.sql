-- Fixes two gaps in the approval notification flow found while wiring up email:
-- 1. When a request advanced past step 1 in a multi-step chain, the step-2+
--    approver never got an in-app notification (only step-1 approvers were
--    notified, at submission time).
-- 2. Rejecting or requesting more info never notified the requester in-app
--    (only the final "approved" outcome did).
--
-- CREATE OR REPLACE only — safe to run on top of 0002/0004.

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
