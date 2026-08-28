-- ============================================================
-- MIGRACIÓN 006: RLS para módulos de negocio
-- Ejecutar DESPUÉS de la migración 005
-- ============================================================

-- ─── Habilitar RLS ───────────────────────────────────────────
alter table public.audit_logs                    enable row level security;
alter table public.services                      enable row level security;
alter table public.clients                       enable row level security;
alter table public.client_services               enable row level security;
alter table public.receivables                   enable row level security;
alter table public.client_payments               enable row level security;
alter table public.employees                     enable row level security;
alter table public.payroll_rules                 enable row level security;
alter table public.payroll_obligations           enable row level security;
alter table public.payroll_payments              enable row level security;
alter table public.recurring_expenses            enable row level security;
alter table public.recurring_expense_obligations enable row level security;

-- ─── POLICIES: audit_logs ────────────────────────────────────
-- Solo lectura para miembros de su workspace
create policy "members can read workspace audit logs"
  on public.audit_logs for select
  using (workspace_id is null or public.is_workspace_member(workspace_id));

-- Escritura solo via SECURITY DEFINER functions
create policy "no direct insert to audit_logs"
  on public.audit_logs for insert with check (false);

-- ─── POLICIES: services ──────────────────────────────────────
create policy "members can read services"
  on public.services for select
  using (public.is_workspace_member(workspace_id));

create policy "admins can manage services"
  on public.services for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "admins can update services"
  on public.services for update
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

-- ─── POLICIES: clients ───────────────────────────────────────
create policy "members can read clients"
  on public.clients for select
  using (public.is_workspace_member(workspace_id));

create policy "members can insert clients"
  on public.clients for insert
  with check (public.is_workspace_member(workspace_id));

create policy "members can update clients"
  on public.clients for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ─── POLICIES: client_services ───────────────────────────────
create policy "members can read client_services"
  on public.client_services for select
  using (public.is_workspace_member(workspace_id));

create policy "members can insert client_services"
  on public.client_services for insert
  with check (public.is_workspace_member(workspace_id));

create policy "members can update client_services"
  on public.client_services for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ─── POLICIES: receivables ───────────────────────────────────
create policy "members can read receivables"
  on public.receivables for select
  using (public.is_workspace_member(workspace_id));

create policy "members can insert receivables"
  on public.receivables for insert
  with check (public.is_workspace_member(workspace_id));

create policy "members can update receivables"
  on public.receivables for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ─── POLICIES: client_payments ───────────────────────────────
create policy "members can read client_payments"
  on public.client_payments for select
  using (public.is_workspace_member(workspace_id));

-- Inserts solo via RPC atómica; this policy allows it from SECURITY DEFINER
create policy "members can insert client_payments"
  on public.client_payments for insert
  with check (public.is_workspace_member(workspace_id));

create policy "admins can update client_payments"
  on public.client_payments for update
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

-- ─── POLICIES: employees ─────────────────────────────────────
create policy "members can read employees"
  on public.employees for select
  using (public.is_workspace_member(workspace_id));

create policy "admins can insert employees"
  on public.employees for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "admins can update employees"
  on public.employees for update
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

-- ─── POLICIES: payroll_rules ─────────────────────────────────
create policy "members can read payroll_rules"
  on public.payroll_rules for select
  using (public.is_workspace_member(workspace_id));

create policy "admins can manage payroll_rules"
  on public.payroll_rules for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "admins can update payroll_rules"
  on public.payroll_rules for update
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

-- ─── POLICIES: payroll_obligations ───────────────────────────
create policy "members can read payroll_obligations"
  on public.payroll_obligations for select
  using (public.is_workspace_member(workspace_id));

create policy "members can insert payroll_obligations"
  on public.payroll_obligations for insert
  with check (public.is_workspace_member(workspace_id));

create policy "members can update payroll_obligations"
  on public.payroll_obligations for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ─── POLICIES: payroll_payments ──────────────────────────────
create policy "members can read payroll_payments"
  on public.payroll_payments for select
  using (public.is_workspace_member(workspace_id));

create policy "members can insert payroll_payments"
  on public.payroll_payments for insert
  with check (public.is_workspace_member(workspace_id));

create policy "admins can update payroll_payments"
  on public.payroll_payments for update
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

-- ─── POLICIES: recurring_expenses ────────────────────────────
create policy "members can read recurring_expenses"
  on public.recurring_expenses for select
  using (public.is_workspace_member(workspace_id));

create policy "admins can manage recurring_expenses"
  on public.recurring_expenses for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "admins can update recurring_expenses"
  on public.recurring_expenses for update
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

-- ─── POLICIES: recurring_expense_obligations ─────────────────
create policy "members can read recurring_expense_obligations"
  on public.recurring_expense_obligations for select
  using (public.is_workspace_member(workspace_id));

create policy "members can insert recurring_expense_obligations"
  on public.recurring_expense_obligations for insert
  with check (public.is_workspace_member(workspace_id));

create policy "members can update recurring_expense_obligations"
  on public.recurring_expense_obligations for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
