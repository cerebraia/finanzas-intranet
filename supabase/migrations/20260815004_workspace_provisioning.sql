-- ============================================================
-- MIGRACIÓN 004: Función para crear workspace + asignar owner
-- Esta función usa SECURITY DEFINER para poder insertar en
-- workspaces y workspace_members desde el frontend.
-- ============================================================

create or replace function public.create_workspace_with_owner(
  p_name  text,
  p_slug  text,
  p_type  workspace_type,
  p_emoji text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_workspace_id uuid;
  v_user_id      uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  -- Verificar que el slug no existe ya
  if exists (select 1 from public.workspaces where slug = p_slug) then
    raise exception 'Ya existe un workspace con ese slug: %', p_slug;
  end if;

  -- Crear workspace
  insert into public.workspaces (name, slug, type, emoji)
  values (p_name, p_slug, p_type, p_emoji)
  returning id into v_workspace_id;

  -- Asignar al usuario como OWNER
  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'OWNER');

  return v_workspace_id;
end;
$$;

-- ─── Política: usuarios pueden llamar a esta función ─────────
-- La función es SECURITY DEFINER por lo que no necesita policy extra
-- pero sí debemos asegurarnos de que sea callable por usuarios autenticados
revoke all on function public.create_workspace_with_owner from public;
grant execute on function public.create_workspace_with_owner to authenticated;
