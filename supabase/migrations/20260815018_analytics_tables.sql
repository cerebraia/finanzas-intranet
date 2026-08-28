-- ============================================================
-- MIGRACIÓN 018: Tablas de analytics — Presupuestos, Metas y Cierre mensual
-- ============================================================

-- ─── Índices adicionales de performance ──────────────────────
-- (Optimizan las consultas analíticas de hitos anteriores)
create index if not exists idx_transactions_workspace_date_type
  on public.transactions(workspace_id, transaction_date, type, status);

create index if not exists idx_debt_installments_workspace_due_status
  on public.debt_installments(workspace_id, due_date, status);

create index if not exists idx_purchase_items_workspace_status
  on public.purchase_items(workspace_id, status)
  where status in ('TODO','PLANNED');

-- ─── Budgets ─────────────────────────────────────────────────
create table public.budgets (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  name             text not null,
  category_id      uuid references public.categories(id),  -- null = presupuesto general
  amount           numeric(18,2) not null,
  currency         text not null default 'USD',
  period_type      text not null default 'MONTHLY'
    check (period_type in ('MONTHLY','QUARTERLY','YEARLY','CUSTOM')),
  start_date       date not null,
  end_date         date not null,
  alert_threshold  numeric(5,2) not null default 80,
  is_active        boolean not null default true,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_budgets_workspace        on public.budgets(workspace_id);
create index idx_budgets_workspace_active on public.budgets(workspace_id, is_active);
create index idx_budgets_period           on public.budgets(start_date, end_date);

create trigger trg_budgets_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

-- ─── Financial Goals ─────────────────────────────────────────
create table public.financial_goals (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  name              text not null,
  description       text,
  target_amount     numeric(18,2) not null,
  currency          text not null default 'USD',
  target_date       date,
  status            text not null default 'ACTIVE'
    check (status in ('ACTIVE','COMPLETED','PAUSED','CANCELLED')),
  priority          text not null default 'MEDIUM'
    check (priority in ('LOW','MEDIUM','HIGH')),
  linked_account_id uuid references public.accounts(id),
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  completed_at      timestamptz
);

create index idx_goals_workspace        on public.financial_goals(workspace_id);
create index idx_goals_workspace_status on public.financial_goals(workspace_id, status);

create trigger trg_goals_updated_at
  before update on public.financial_goals
  for each row execute function public.set_updated_at();

-- ─── Goal Contributions ──────────────────────────────────────
create table public.goal_contributions (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  goal_id           uuid not null references public.financial_goals(id) on delete cascade,
  amount            numeric(18,2) not null,
  contribution_date date not null default current_date,
  account_id        uuid references public.accounts(id),
  notes             text,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now()
);

create index idx_goal_contributions_goal      on public.goal_contributions(goal_id);
create index idx_goal_contributions_workspace on public.goal_contributions(workspace_id);
create index idx_goal_contributions_date      on public.goal_contributions(goal_id, contribution_date);

-- ─── Monthly Closures ────────────────────────────────────────
create table public.monthly_closures (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references public.workspaces(id) on delete cascade,
  year                int not null,
  month               int not null check (month between 1 and 12),

  -- Métricas del período
  income              numeric(18,2) not null default 0,
  expenses            numeric(18,2) not null default 0,
  balance             numeric(18,2) not null default 0,

  -- Fernando ADS (nullable — solo si aplica)
  billed              numeric(18,2) not null default 0,
  collected           numeric(18,2) not null default 0,

  -- Pendientes al momento del cierre
  receivables_pending numeric(18,2) not null default 0,
  payables_pending    numeric(18,2) not null default 0,

  -- Estado de liquidez al cierre
  available_cash      numeric(18,2) not null default 0,
  total_debt          numeric(18,2) not null default 0,
  committed_amount    numeric(18,2) not null default 0,
  planned_purchases   numeric(18,2) not null default 0,

  -- Snapshot completo en JSON (inmutable histórico)
  snapshot            jsonb not null default '{}',

  -- Control
  is_reopened         boolean not null default false,
  reopened_at         timestamptz,
  closed_by           uuid references auth.users(id),
  closed_at           timestamptz not null default now(),

  unique (workspace_id, year, month)
);

create index idx_monthly_closures_workspace on public.monthly_closures(workspace_id, year desc, month desc);
