-- Same audit, same class of bug as 0039's requests_update fix: a blanket
-- write policy granting more than the app's own legitimate code path ever
-- uses, reachable via a direct client call using a real session.
--
-- 1. payments_write let any finance/admin INSERT or UPDATE a payments row
--    with status = 'success' directly. The app itself only ever inserts
--    'pending' and updates to 'failed' (initiatePayment's catch block) —
--    'success'/'reversed' are only ever meant to be set by the Paystack/
--    Flutterwave webhook, which uses the service-role client and bypasses
--    RLS entirely regardless of this policy. But the purchase-order detail
--    page computes "amount paid" by live-summing payments where
--    status = 'success' (src/app/(app)/purchase-orders/[id]/page.tsx) — so
--    a rogue finance/admin could fabricate a fully-paid vendor payment,
--    with no real transfer ever happening, by directly inserting or
--    updating a payments row. Split into insert/update policies that can
--    never touch 'success' or 'reversed'.
--
-- 2. rfqs_write / rfq_quotes_write had no legitimate direct-client use at
--    all — create_rfq, add_rfq_quote, and award_rfq_quote are all
--    security-definer RPCs (bypass RLS as table owner). The blanket
--    is_procurement_or_admin() policies let anyone in those roles directly
--    mark a quote as_winner or an rfq as 'awarded' without ever going
--    through award_rfq_quote's atomicity/duplicate-PO guard. Removed
--    entirely, same as requests_update's admin bypass in 0039.

drop policy payments_write on payments;

create policy payments_insert on payments for insert with check (
  organization_id = current_organization_id() and is_admin_role() and status = 'pending'
);

create policy payments_update on payments for update using (
  organization_id = current_organization_id() and is_admin_role() and status = 'pending'
) with check (
  organization_id = current_organization_id() and is_admin_role() and status in ('pending', 'failed')
);

drop policy rfqs_write on rfqs;
drop policy rfq_quotes_write on rfq_quotes;
