-- =============================================================================
-- Work-Hub · 0004 · Storage
--
-- Three buckets, each with a path convention that the policies rely on:
--
--   avatars/<user_id>/<file>                         public read, owner write
--   org-logos/<organization_id>/<file>               public read, org:manage write
--   ticket-attachments/<organization_id>/<ticket_id>/<file>
--                                                    private, tenant-scoped
--
-- Binary data never lives in a table; only the metadata row does.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152,
   array['image/png', 'image/jpeg', 'image/webp']),
  ('org-logos', 'org-logos', true, 2097152,
   array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('ticket-attachments', 'ticket-attachments', false, 10485760, null)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- avatars
-- -----------------------------------------------------------------------------
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists avatars_write_own on storage.objects;
create policy avatars_write_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- -----------------------------------------------------------------------------
-- org-logos
-- -----------------------------------------------------------------------------
drop policy if exists org_logos_read on storage.objects;
create policy org_logos_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'org-logos');

drop policy if exists org_logos_write on storage.objects;
create policy org_logos_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org-logos'
    and public.has_org_permission(((storage.foldername(name))[1])::uuid, 'org:manage')
  );

drop policy if exists org_logos_update on storage.objects;
create policy org_logos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'org-logos'
    and public.has_org_permission(((storage.foldername(name))[1])::uuid, 'org:manage')
  )
  with check (
    bucket_id = 'org-logos'
    and public.has_org_permission(((storage.foldername(name))[1])::uuid, 'org:manage')
  );

drop policy if exists org_logos_delete on storage.objects;
create policy org_logos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'org-logos'
    and public.has_org_permission(((storage.foldername(name))[1])::uuid, 'org:manage')
  );

-- -----------------------------------------------------------------------------
-- ticket-attachments — private, tenant-scoped by the first path segment
-- -----------------------------------------------------------------------------
drop policy if exists ticket_attachments_read on storage.objects;
create policy ticket_attachments_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ticket-attachments'
    and public.can_see_ticket(
      ((storage.foldername(name))[1])::uuid,
      ((storage.foldername(name))[2])::uuid
    )
  );

drop policy if exists ticket_attachments_write on storage.objects;
create policy ticket_attachments_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ticket-attachments'
    and public.has_org_permission(((storage.foldername(name))[1])::uuid, 'tickets:update')
    and public.can_see_ticket(
      ((storage.foldername(name))[1])::uuid,
      ((storage.foldername(name))[2])::uuid
    )
  );

drop policy if exists ticket_attachments_remove on storage.objects;
create policy ticket_attachments_remove on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'ticket-attachments'
    and (
      owner_id = auth.uid()::text
      or public.has_org_permission(((storage.foldername(name))[1])::uuid, 'tickets:delete')
    )
  );
