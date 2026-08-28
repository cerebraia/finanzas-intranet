-- ============================================================
-- MIGRACIÓN 012: Bucket de Storage para avatares de usuario
-- ============================================================

-- Crear bucket público para avatares
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,                                          -- 2 MB máximo
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

-- ─── Policies de Storage ─────────────────────────────────────

-- Lectura pública — cualquiera puede ver los avatares (URLs públicas)
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Subir avatar — solo el propio usuario puede subir en su carpeta
create policy "avatars_user_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Reemplazar avatar — solo el propio usuario puede actualizar su archivo
create policy "avatars_user_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Eliminar avatar — solo el propio usuario puede borrar su archivo
create policy "avatars_user_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
