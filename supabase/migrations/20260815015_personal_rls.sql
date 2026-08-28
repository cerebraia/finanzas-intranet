-- ============================================================
-- MIGRACIÓN 015: RLS para Debts, Purchase Items y Reminders
-- ============================================================

-- ─── RLS ON ──────────────────────────────────────────────────
alter table public.debts                 enable row level security;
alter table public.debt_installments     enable row level security;
alter table public.debt_payments         enable row level security;
alter table public.purchase_items        enable row level security;
alter table public.reminders             enable row level security;

-- ─── DEBTS ───────────────────────────────────────────────────
create policy "members can read debts"
  on public.debts for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members can insert debts"
  on public.debts for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "members can update debts"
  on public.debts for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ─── DEBT INSTALLMENTS ───────────────────────────────────────
create policy "members can read debt_installments"
  on public.debt_installments for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members can insert debt_installments"
  on public.debt_installments for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "members can update debt_installments"
  on public.debt_installments for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ─── DEBT PAYMENTS ───────────────────────────────────────────
create policy "members can read debt_payments"
  on public.debt_payments for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members can insert debt_payments"
  on public.debt_payments for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "admins can update debt_payments"
  on public.debt_payments for update
  to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

-- ─── PURCHASE ITEMS ──────────────────────────────────────────
-- workspace_id puede ser null (items personales sin workspace específico)
create policy "authenticated can read own purchase_items"
  on public.purchase_items for select
  to authenticated
  using (
    (workspace_id is null and created_by = auth.uid())
    or (workspace_id is not null and public.is_workspace_member(workspace_id))
  );

create policy "authenticated can insert purchase_items"
  on public.purchase_items for insert
  to authenticated
  with check (
    (workspace_id is null)
    or public.is_workspace_member(workspace_id)
  );

create policy "authenticated can update own purchase_items"
  on public.purchase_items for update
  to authenticated
  using (
    (workspace_id is null and created_by = auth.uid())
    or (workspace_id is not null and public.is_workspace_member(workspace_id))
  );

create policy "authenticated can delete own purchase_items"
  on public.purchase_items for delete
  to authenticated
  using (
    (workspace_id is null and created_by = auth.uid())
    or (workspace_id is not null and public.is_workspace_member(workspace_id))
  );

-- ─── REMINDERS ───────────────────────────────────────────────
create policy "authenticated can read own reminders"
  on public.reminders for select
  to authenticated
  using (
    (workspace_id is null and created_by = auth.uid())
    or (workspace_id is not null and public.is_workspace_member(workspace_id))
  );

create policy "authenticated can insert reminders"
  on public.reminders for insert
  to authenticated
  with check (
    (workspace_id is null)
    or public.is_workspace_member(workspace_id)
  );

create policy "authenticated can update own reminders"
  on public.reminders for update
  to authenticated
  using (
    (workspace_id is null and created_by = auth.uid())
    or (workspace_id is not null and public.is_workspace_member(workspace_id))
  );

create policy "authenticated can delete own reminders"
  on public.reminders for delete
  to authenticated
  using (
    (workspace_id is null and created_by = auth.uid())
    or (workspace_id is not null and public.is_workspace_member(workspace_id))
  );
