-- ============================================================
-- MIGRACIÓN 019: RLS para tablas de analytics
-- ============================================================

alter table public.budgets           enable row level security;
alter table public.financial_goals   enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.monthly_closures  enable row level security;

-- ─── Budgets ─────────────────────────────────────────────────
create policy "members can read budgets"
  on public.budgets for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members can insert budgets"
  on public.budgets for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "members can update budgets"
  on public.budgets for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "admins can delete budgets"
  on public.budgets for delete to authenticated
  using (public.is_workspace_admin(workspace_id));

-- ─── Financial Goals ─────────────────────────────────────────
create policy "members can read goals"
  on public.financial_goals for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members can insert goals"
  on public.financial_goals for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "members can update goals"
  on public.financial_goals for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ─── Goal Contributions ──────────────────────────────────────
create policy "members can read goal_contributions"
  on public.goal_contributions for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members can insert goal_contributions"
  on public.goal_contributions for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "admins can delete goal_contributions"
  on public.goal_contributions for delete to authenticated
  using (public.is_workspace_admin(workspace_id));

-- ─── Monthly Closures ────────────────────────────────────────
-- Solo lectura para miembros — escritura solo via RPC SECURITY DEFINER
create policy "members can read monthly_closures"
  on public.monthly_closures for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- INSERT y UPDATE solo via RPC close_financial_month
create policy "no direct insert to closures"
  on public.monthly_closures for insert
  with check (false);

create policy "no direct update to closures"
  on public.monthly_closures for update
  using (false);
