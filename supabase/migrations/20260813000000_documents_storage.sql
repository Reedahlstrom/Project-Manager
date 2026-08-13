-- Document storage.
--
-- One PRIVATE bucket. There are no public buckets in this project and there
-- must never be one — a public bucket URL is an unauthenticated link to a file,
-- which for this application means a link to Church or Angel material that
-- works for anyone who has it.
--
-- Files are keyed by project: `<project_id>/<uuid>-<filename>`. The first path
-- segment is what the policies read, so a file's access follows its project and
-- inherits the restricted cascade for free.

insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 52428800)  -- 50 MB
on conflict (id) do update set public = false;

-- The first path segment as a uuid, or null if the path is malformed.
-- A plain cast would raise on a bad path and turn a policy error into a 500;
-- returning null makes it deny instead, which is the right direction to fail.
create or replace function public.storage_project_id(object_name text)
returns uuid
language plpgsql
immutable
as $$
declare
  v_first text;
begin
  v_first := split_part(object_name, '/', 1);
  return v_first::uuid;
exception
  when others then return null;
end
$$;

-- Read. Access follows the project, so a restricted project's files are
-- invisible to Heather exactly as its notes are.
create policy documents_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and public.can_access_project(public.storage_project_id(name))
  );

create policy documents_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and public.is_member()
    and public.can_access_project(public.storage_project_id(name))
  );

create policy documents_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and public.can_access_project(public.storage_project_id(name))
  );

create policy documents_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and public.can_access_project(public.storage_project_id(name))
  );
