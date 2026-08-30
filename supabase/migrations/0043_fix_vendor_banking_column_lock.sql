-- 0042's `revoke update (col, col, ...) on vendors from authenticated` was
-- verified live to be a no-op: Supabase's default setup already grants
-- table-level UPDATE on every table to `authenticated` (visible via
-- information_schema.table_privileges), and a column-level REVOKE cannot
-- narrow a broader table-level GRANT — Postgres checks "does the role have
-- table-level UPDATE, OR column-level UPDATE for this column," so the
-- table-level grant alone was still sufficient. Confirmed by a live raw
-- PATCH to vendors.account_number succeeding (200) even after 0042 applied.
--
-- The correct shape is an allow-list, not a deny-list: revoke the blanket
-- table-level UPDATE entirely, then grant UPDATE back only on the columns
-- that are safe for direct client writes. update_vendor_payout (security
-- definer, from 0042) still writes the banking columns normally, since it
-- runs as the function owner regardless of the calling role's grants.
revoke update on vendors from authenticated;
grant update (
  name, category, contact_email, contact_phone, payment_terms, bank_details, documents,
  is_approved, performance_notes, default_currency, ncdmb_compliant,
  ncdmb_certificate_number, ncdmb_certificate_expiry, local_content_percentage, organization_id
) on vendors to authenticated;
