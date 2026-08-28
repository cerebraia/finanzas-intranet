-- ============================================================
-- MIGRACIÓN 013: Tablas de Deudas, Cashea y SAN
-- ============================================================

-- ─── Debts ───────────────────────────────────────────────────
create table public.debts (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  name             text not null,
  provider         text,
  description      text,
  type             text not null
    check (type in ('CASHEA','SAN','LOAN','CREDIT_CARD','INSTALLMENT','PERSONAL','OTHER')),
  -- SAN puede ser por pagar o por cobrar
  san_direction    text
    check (san_direction in ('PAYABLE','RECEIVABLE')),
  original_amount  numeric(18,2) not null,
  down_payment     numeric(18,2) not null default 0,
  financed_amount  numeric(18,2) not null,
  installments     int not null,
  monthly_amount   numeric(18,2) not null,
  currency         text not null default 'USD',
  start_date       date not null,
  end_date         date,
  status           text not null default 'ACTIVE'
    check (status in ('ACTIVE','PAID','PAUSED','CANCELLED','DEFAULTED')),
  notes            text,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_debts_workspace        on public.debts(workspace_id);
create index idx_debts_workspace_type   on public.debts(workspace_id, type);
create index idx_debts_workspace_status on public.debts(workspace_id, status);

create trigger trg_debts_updated_at
  before update on public.debts
  for each row execute function public.set_updated_at();

-- ─── Debt Installments ───────────────────────────────────────
create table public.debt_installments (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references public.workspaces(id) on delete cascade,
  debt_id             uuid not null references public.debts(id) on delete cascade,
  installment_number  int not null,
  amount              numeric(18,2) not null,
  amount_paid         numeric(18,2) not null default 0,
  due_date            date not null,
  status              text not null default 'PENDING'
    check (status in ('PENDING','PARTIAL','PAID','CANCELLED')),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (debt_id, installment_number)
);

create index idx_debt_installments_debt      on public.debt_installments(debt_id);
create index idx_debt_installments_workspace on public.debt_installments(workspace_id, due_date);
create index idx_debt_installments_status    on public.debt_installments(debt_id, status);

create trigger trg_debt_installments_updated_at
  before update on public.debt_installments
  for each row execute function public.set_updated_at();

-- ─── Debt Payments ───────────────────────────────────────────
create table public.debt_payments (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  debt_id         uuid not null references public.debts(id),
  installment_id  uuid not null references public.debt_installments(id),
  account_id      uuid not null references public.accounts(id),
  amount          numeric(18,2) not null,
  currency        text not null default 'USD',
  payment_date    date not null,
  reference       text,
  notes           text,
  transaction_id  uuid unique references public.transactions(id),
  cancelled       boolean not null default false,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index idx_debt_payments_installment on public.debt_payments(installment_id);
create index idx_debt_payments_debt        on public.debt_payments(debt_id);
create index idx_debt_payments_workspace   on public.debt_payments(workspace_id, payment_date);
