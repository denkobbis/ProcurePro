-- Supabase's security advisor flagged these two as the only functions in the
-- schema still missing `set search_path = public` (every other function
-- already has it, per the 0004_fix_search_path.sql precedent). Neither is
-- SECURITY DEFINER, so the practical risk is low, but pinning search_path is
-- free, standard hardening and keeps every function in the schema consistent.

create or replace function set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function append_vendor_document(p_vendor_id uuid, p_document jsonb)
returns void language sql set search_path = public as $$
  update vendors set documents = coalesce(documents, '[]'::jsonb) || p_document where id = p_vendor_id;
$$;
