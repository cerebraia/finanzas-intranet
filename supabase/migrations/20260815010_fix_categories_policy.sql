-- ============================================================
-- MIGRACIÓN 010: Separar policies de categorías
-- El problema: la policy original llama is_workspace_member() incluso
-- para categorías del sistema (workspace_id IS NULL), lo que puede
-- generar errores si el usuario no tiene permiso sobre la función.
-- Fix: dos policies separadas — una para sistema, otra para workspace.
-- ============================================================

-- Eliminar policy original que mezcla ambos casos
drop policy if exists "all authenticated users can read system categories" on public.categories;

-- Policy 1: Categorías del sistema (workspace_id IS NULL) visibles a todos los autenticados
create policy "authenticated can read system categories"
  on public.categories for select
  to authenticated
  using (workspace_id is null and is_active = true);

-- Policy 2: Categorías específicas del workspace visibles a miembros
create policy "members can read workspace categories"
  on public.categories for select
  using (workspace_id is not null and public.is_workspace_member(workspace_id) and is_active = true);
