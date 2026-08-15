-- getVendorScorecard() and getBottleneckFlags() were pulling every historical
-- row (all RFQ quotes, all non-draft POs, all PO line items for vendor-score;
-- every decided approval ever, org-wide, for approval-bottleneck) and
-- aggregating in JS on every page render. Fine at seed scale; the first real
-- customer with real RFQ/approval volume will feel it. Moving the aggregation
-- into SQL views computed once by Postgres instead of shipped row-by-row over
-- the wire.

-- Per-vendor scorecard: quote count/response time, PO count/fully-received
-- rate, and line-item fulfillment rate. Computed as three independent CTEs
-- joined on vendor_id rather than one multi-join query, since joining
-- rfq_quotes and po_line_items directly would fan out and inflate SUM/COUNT
-- on both sides.
create view v_vendor_scorecard
with (security_invoker = true) as
with quote_stats as (
  select
    q.vendor_id,
    count(*) as quote_count,
    avg(extract(epoch from (q.created_at - r.created_at)) / 86400.0)
      filter (where r.created_at is not null and q.created_at >= r.created_at) as avg_response_days
  from rfq_quotes q
  join rfqs r on r.id = q.rfq_id
  group by q.vendor_id
),
po_stats as (
  select
    vendor_id,
    count(*) as po_count,
    (count(*) filter (where status in ('fully_received', 'closed')))::numeric / nullif(count(*), 0) as fully_received_rate
  from purchase_orders
  where status <> 'draft'
  group by vendor_id
),
line_stats as (
  select
    po.vendor_id,
    sum(least(li.received_qty, li.qty)) as total_received,
    sum(li.qty) as total_qty
  from purchase_orders po
  join po_line_items li on li.po_id = po.id
  where po.status <> 'draft'
  group by po.vendor_id
)
select
  v.id as vendor_id,
  v.organization_id,
  coalesce(qs.quote_count, 0) as quote_count,
  qs.avg_response_days,
  coalesce(ps.po_count, 0) as po_count,
  ps.fully_received_rate,
  case when ls.total_qty > 0 then ls.total_received / ls.total_qty else null end as fulfillment_rate
from vendors v
left join quote_stats qs on qs.vendor_id = v.id
left join po_stats ps on ps.vendor_id = v.id
left join line_stats ls on ls.vendor_id = v.id;

-- Historical average wait per (approver_role, step_order) bucket, across all
-- decided approvals. "Wait" for step 1 is acted_at - created_at; for step N>1
-- it's acted_at - the previous step's acted_at (when this step actually
-- became active), via a self-join. This is the one-row-per-bucket aggregate
-- getBottleneckFlags() needs — the per-pending-item "waiting since" baseline
-- still happens in application code, but scoped to just the (small) set of
-- currently pending approvals, not the full historical table.
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
  and (a.step_order = 1 or prev.acted_at is not null)
group by a.approver_role, a.step_order;
