-- ============================================================
-- MIGRACIÓN 011: Restringir policies de categories a rol authenticated
-- Las policies deben aplicarse solo a usuarios autenticados.
-- Anon no debe llegar a llamar is_workspace_member en ningún caso.
-- ============================================================

-- Recrear policy de workspace categories con restricción de rol
drop policy if exists "members can read workspace categories" on public.categories;

create policy "members can read workspace categories"
  on public.categories for select
  to authenticated
  using (workspace_id is not null and public.is_workspace_member(workspace_id) and is_active = true);
