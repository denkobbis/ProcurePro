-- Private bucket for request attachments (quotes/invoices) and vendor documents.
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Any signed-in user can upload/view files in this bucket. Row-level visibility of
-- *which* attachment a user should know about is already enforced by the
-- request_attachments / vendors tables (RLS) that hold the file paths — this
-- just gates the bucket to your company's signed-in users, not the public.
create policy "attachments_insert_authenticated" on storage.objects
  for insert to authenticated with check (bucket_id = 'attachments');

create policy "attachments_select_authenticated" on storage.objects
  for select to authenticated using (bucket_id = 'attachments');
