-- uploadVendorDocument did read-then-write on vendors.documents (a jsonb
-- array): two concurrent uploads to the same vendor both read the same
-- starting array, both append their own entry, and whichever write lands
-- second silently drops the first entry (the file itself stays in Storage,
-- but its metadata record is lost from the UI). jsonb || jsonb concatenation
-- happens inside a single UPDATE statement, so Postgres's normal row-level
-- locking during the UPDATE serializes concurrent callers correctly. Not
-- SECURITY DEFINER — runs with the caller's own rights, so the existing
-- vendors_write RLS policy (org match + is_procurement_or_admin()) still
-- applies exactly as it does for a normal update from this client.
create or replace function append_vendor_document(p_vendor_id uuid, p_document jsonb)
returns void language sql as $$
  update vendors set documents = coalesce(documents, '[]'::jsonb) || p_document where id = p_vendor_id;
$$;
