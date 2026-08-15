-- v_approval_wait_stats (migration 0029) excluded any approval row that
-- wasn't step_order 1 and didn't have a step_order-1 sibling:
--   where a.status in ('approved','rejected') and a.acted_at is not null
--     and (a.step_order = 1 or prev.acted_at is not null)
-- That silently drops every finance-only chain: a request whose amount only
-- matches a rule with step_order 2+ (e.g. approval_rules seeded with an
-- approver step capped at max_amount=500000 and a separate finance_admin
-- step starting at min_amount=500000) has no step_order=1 row at all, so
-- "step_order=1 or prev exists" is false for its only step and it never
-- contributed to the historical average or got flagged as a bottleneck.
--
-- Fix: coalesce(prev.acted_at, a.created_at) already handles "no prior step"
-- correctly by falling back to created_at — the extra where-clause exclusion
-- was unnecessary and wrong. Just drop it.

drop view v_approval_wait_stats;

create view v_approval_wait_stats
with (security_invoker = true) as
select
  a.approver_role,
  a.step_order,
  avg(extract(epoch from (a.acted_at - coalesce(prev.acted_at, a.created_at))) / 86400.0) as avg_wait_days,
  count(*) as sample_count
from approvals a
left join approvals prev
  on prev.request_id = a.request_id
  and prev.step_order = a.step_order - 1
  and prev.status = 'approved'
where a.status in ('approved', 'rejected')
  and a.acted_at is not null
group by a.approver_role, a.step_order;
