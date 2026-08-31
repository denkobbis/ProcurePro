-- attachments_insert only checked `uploaded_by = auth.uid()` -- unlike its
-- sibling comments_insert, it never verified the target request belongs to
-- the caller's own organization. Neither addRequestAttachment nor
-- addRequestComment check that at the app layer either (both just trust
-- RLS), so comments were protected only by luck of a stricter policy while
-- attachments were not: any authenticated user on the platform, in any
-- organization, could call addRequestAttachment with a request_id belonging
-- to a completely different tenant and have the fake attachment (arbitrary
-- file_path/file_name) inserted onto that org's request. Fixing to match
-- comments_insert exactly.

drop policy attachments_insert on request_attachments;
create policy attachments_insert on request_attachments for insert
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from requests r
      where r.id = request_attachments.request_id
        and r.organization_id = current_organization_id()
    )
  );
