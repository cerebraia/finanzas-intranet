-- ============================================================
-- MIGRACIÓN 005: Schema módulos de negocio
-- Ejecutar en Supabase SQL Editor DESPUÉS de las migraciones 001-004
-- ============================================================

-- ─── Audit Logs ──────────────────────────────────────────────
create table public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  workspace_id uuid,
  action       text not null,
  entity_type  text not null,
  entity_id    uuid,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);
create index idx_audit_logs_workspace on public.audit_logs(workspace_id, created_at desc);
create index idx_audit_logs_entity    on public.audit_logs(entity_type, entity_id);

-- ─── Services (catálogo de servicios del workspace) ──────────
create table public.services (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  description  text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_services_workspace on public.services(workspace_id);
create trigger trg_services_updated_at before update on public.services
  for each row execute function public.set_updated_at();

-- ─── Clients ─────────────────────────────────────────────────
create table public.clients (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  company_name text,
  email        text,
  phone        text,
  status       text not null default 'ACTIVE'
    check (status in ('ACTIVE','PAUSED','INACTIVE')),
  notes        text,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_clients_workspace on public.clients(workspace_id);
create index idx_clients_status    on public.clients(workspace_id, status);
create trigger trg_clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

-- ─── Client Services ─────────────────────────────────────────
create table public.client_services (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  client_id         uuid not null references public.clients(id) on delete cascade,
  service_id        uuid not null references public.services(id),
  price             numeric(18,2) not null,
  currency          text not null default 'USD',
  billing_frequency text not null default 'MONTHLY'
    check (billing_frequency in ('MONTHLY','ONE_TIME','CUSTOM')),
  billing_day       int,
  start_date        date not null,
  end_date          date,
  status            text not null default 'ACTIVE'
    check (status in ('ACTIVE','PAUSED','CANCELLED')),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_client_services_client    on public.client_services(client_id);
create index idx_client_services_workspace on public.client_services(workspace_id, status);
create trigger trg_client_services_updated_at before update on public.client_services
  for each row execute function public.set_updated_at();

-- ─── Receivables ─────────────────────────────────────────────
create table public.receivables (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  client_id         uuid not null references public.clients(id),
  client_service_id uuid references public.client_services(id),
  description       text not null,
  amount            numeric(18,2) not null,
  amount_paid       numeric(18,2) not null default 0,
  currency          text not null default 'USD',
  due_date          date not null,
  period_month      int,
  period_year       int,
  status            text not null default 'PENDING'
    check (status in ('PENDING','PARTIAL','PAID','CANCELLED')),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Evitar duplicar cobros del mismo período para el mismo servicio
  unique (client_service_id, period_month, period_year)
);
create index idx_receivables_workspace_due   on public.receivables(workspace_id, due_date);
create index idx_receivables_workspace_status on public.receivables(workspace_id, status);
create index idx_receivables_client          on public.receivables(client_id);
create trigger trg_receivables_updated_at before update on public.receivables
  for each row execute function public.set_updated_at();

-- ─── Client Payments ─────────────────────────────────────────
create table public.client_payments (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  client_id      uuid not null references public.clients(id),
  receivable_id  uuid not null references public.receivables(id),
  account_id     uuid not null references public.accounts(id),
  amount         numeric(18,2) not null,
  currency       text not null default 'USD',
  payment_date   date not null,
  reference      text,
  notes          text,
  transaction_id uuid unique references public.transactions(id),
  cancelled      boolean not null default false,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index idx_client_payments_receivable on public.client_payments(receivable_id);
create index idx_client_payments_client     on public.client_payments(client_id);
create index idx_client_payments_workspace  on public.client_payments(workspace_id, payment_date);

-- ─── Employees ───────────────────────────────────────────────
create table public.employees (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  email        text,
  phone        text,
  role_name    text,
  status       text not null default 'ACTIVE'
    check (status in ('ACTIVE','PAUSED','INACTIVE')),
  notes        text,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_employees_workspace on public.employees(workspace_id);
create index idx_employees_status    on public.employees(workspace_id, status);
create trigger trg_employees_updated_at before update on public.employees
  for each row execute function public.set_updated_at();

-- ─── Payroll Rules ───────────────────────────────────────────
create table public.payroll_rules (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces(id) on delete cascade,
  employee_id        uuid not null references public.employees(id) on delete cascade,
  amount             numeric(18,2) not null,
  currency           text not null default 'USD',
  frequency          text not null default 'MONTHLY'
    check (frequency in ('MONTHLY','BIWEEKLY','WEEKLY','ONE_TIME','CUSTOM')),
  payment_day        int not null,
  second_payment_day int,
  start_date         date not null,
  end_date           date,
  status             text not null default 'ACTIVE'
    check (status in ('ACTIVE','PAUSED','CANCELLED')),
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index idx_payroll_rules_employee  on public.payroll_rules(employee_id);
create index idx_payroll_rules_workspace on public.payroll_rules(workspace_id, status);
create trigger trg_payroll_rules_updated_at before update on public.payroll_rules
  for each row execute function public.set_updated_at();

-- ─── Payroll Obligations ─────────────────────────────────────
create table public.payroll_obligations (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  employee_id     uuid not null references public.employees(id),
  payroll_rule_id uuid not null references public.payroll_rules(id),
  description     text not null,
  amount          numeric(18,2) not null,
  amount_paid     numeric(18,2) not null default 0,
  currency        text not null default 'USD',
  due_date        date not null,
  period_month    int not null,
  period_year     int not null,
  status          text not null default 'PENDING'
    check (status in ('PENDING','PARTIAL','PAID','CANCELLED')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (payroll_rule_id, period_month, period_year)
);
create index idx_payroll_obls_workspace on public.payroll_obligations(workspace_id, due_date);
create index idx_payroll_obls_employee  on public.payroll_obligations(employee_id, status);
create trigger trg_payroll_obligations_updated_at before update on public.payroll_obligations
  for each row execute function public.set_updated_at();

-- ─── Payroll Payments ────────────────────────────────────────
create table public.payroll_payments (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references public.workspaces(id) on delete cascade,
  employee_id          uuid not null references public.employees(id),
  payroll_obligation_id uuid not null references public.payroll_obligations(id),
  account_id           uuid not null references public.accounts(id),
  amount               numeric(18,2) not null,
  currency             text not null default 'USD',
  payment_date         date not null,
  reference            text,
  notes                text,
  transaction_id       uuid unique references public.transactions(id),
  cancelled            boolean not null default false,
  created_by           uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now()
);
create index idx_payroll_payments_obligation on public.payroll_payments(payroll_obligation_id);
create index idx_payroll_payments_employee   on public.payroll_payments(employee_id);
create index idx_payroll_payments_workspace  on public.payroll_payments(workspace_id, payment_date);

-- ─── Recurring Expenses ──────────────────────────────────────
create table public.recurring_expenses (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces(id) on delete cascade,
  name               text not null,
  amount             numeric(18,2) not null,
  currency           text not null default 'USD',
  category_id        uuid not null references public.categories(id),
  frequency          text not null default 'MONTHLY'
    check (frequency in ('MONTHLY','BIWEEKLY','WEEKLY','ONE_TIME','CUSTOM')),
  payment_day        int not null,
  default_account_id uuid references public.accounts(id),
  start_date         date not null,
  end_date           date,
  is_active          boolean not null default true,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index idx_recurring_expenses_workspace on public.recurring_expenses(workspace_id);
create trigger trg_recurring_expenses_updated_at before update on public.recurring_expenses
  for each row execute function public.set_updated_at();

-- ─── Recurring Expense Obligations ───────────────────────────
create table public.recurring_expense_obligations (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references public.workspaces(id) on delete cascade,
  recurring_expense_id uuid not null references public.recurring_expenses(id) on delete cascade,
  amount               numeric(18,2) not null,
  due_date             date not null,
  period_month         int not null,
  period_year          int not null,
  status               text not null default 'PENDING'
    check (status in ('PENDING','PAID','CANCELLED')),
  transaction_id       uuid unique references public.transactions(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  unique (recurring_expense_id, period_month, period_year)
);
create index idx_recurring_obls_workspace on public.recurring_expense_obligations(workspace_id, due_date);
create index idx_recurring_obls_expense   on public.recurring_expense_obligations(recurring_expense_id);
create trigger trg_recurring_obls_updated_at before update on public.recurring_expense_obligations
  for each row execute function public.set_updated_at();
