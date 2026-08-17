-- comments_insert only ever checked author_id = auth.uid() — it never
-- validated that request_id belongs to the caller's own organization, unlike
-- comments_select which was correctly scoped during the multi-tenancy
-- retrofit (migration 0013). Any authenticated user could insert a comment
-- onto any request_id from any organization.
drop policy comments_insert on request_comments;
create policy comments_insert on request_comments for insert with check (
  author_id = auth.uid()
  and exists (select 1 from requests r where r.id = request_id and r.organization_id = current_organization_id())
);
