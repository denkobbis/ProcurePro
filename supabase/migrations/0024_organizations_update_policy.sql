-- organizations had RLS enabled with only a SELECT policy — every UPDATE
-- (org rename, the billing checkout callback, subscription cancel) was
-- silently affecting 0 rows instead of erroring, since Postgres RLS with no
-- matching policy just excludes all rows rather than raising an error.
create policy organizations_update on organizations for update
  using (id = current_organization_id() and is_admin_role())
  with check (id = current_organization_id() and is_admin_role());
