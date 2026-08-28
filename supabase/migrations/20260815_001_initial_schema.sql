-- ============================================================
-- MIGRACIÓN 001: Schema inicial para finanzas-intranet
-- Ejecutar en Supabase SQL Editor (Project → SQL Editor → New query)
-- ============================================================

-- ─── Extensiones ─────────────────────────────────────────────


-- ─── Enums ───────────────────────────────────────────────────
create type workspace_type as enum ('PERSONAL', 'BUSINESS');
create type workspace_member_role as enum ('OWNER', 'ADMIN', 'MANAGER', 'VIEWER');
create type account_type as enum ('BANK', 'CASH', 'ZELLE', 'CRYPTO', 'CREDIT_CARD', 'OTHER');
create type currency_type as enum ('USD', 'VES', 'EUR');
create type category_type as enum ('INCOME', 'EXPENSE');
create type transaction_type as enum ('INCOME', 'EXPENSE', 'TRANSFER');
create type transaction_status as enum ('PENDING', 'COMPLETED', 'CANCELLED');
create type transaction_source_type as enum (
  'MANUAL', 'CLIENT_PAYMENT', 'PAYROLL_PAYMENT',
  'RECURRING_EXPENSE', 'DEBT_PAYMENT', 'PURCHASE', 'TRANSFER'
);

-- ─── Función genérica para updated_at ────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── PROFILES ─────────────────────────────────────────────────
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  first_name      text not null,
  last_name       text not null,
  avatar_url      text,
  default_currency currency_type not null default 'USD',
  timezone        text not null default 'America/Caracas',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Trigger: crear profile automáticamente al crear usuario en auth.users
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  raw_first text;
  raw_last  text;
begin
  raw_first := coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1));
  raw_last  := coalesce(new.raw_user_meta_data->>'last_name', '');

  insert into public.profiles (id, first_name, last_name)
  values (new.id, raw_first, raw_last)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── WORKSPACES ───────────────────────────────────────────────
create table public.workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  type       workspace_type not null,
  emoji      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_workspaces_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- ─── WORKSPACE MEMBERS ────────────────────────────────────────
create table public.workspace_members (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         workspace_member_role not null default 'VIEWER',
  created_at   timestamptz not null default now(),

  unique (workspace_id, user_id)
);

create index idx_workspace_members_workspace on public.workspace_members(workspace_id);
create index idx_workspace_members_user     on public.workspace_members(user_id);

-- ─── ACCOUNTS ─────────────────────────────────────────────────
create table public.accounts (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  name            text not null,
  type            account_type not null,
  currency        currency_type not null default 'USD',
  initial_balance numeric(18,2) not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_accounts_workspace on public.accounts(workspace_id);

create trigger trg_accounts_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

-- ─── CATEGORIES ───────────────────────────────────────────────
create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,  -- null = categoría global del sistema
  name         text not null,
  type         category_type not null,
  icon         text,
  is_system    boolean not null default false,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_categories_workspace on public.categories(workspace_id);
create index idx_categories_type      on public.categories(type);

create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ─── TRANSACTIONS ─────────────────────────────────────────────
create table public.transactions (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  account_id       uuid not null references public.accounts(id),
  category_id      uuid not null references public.categories(id),
  client_id        uuid,                -- referencia futura a tabla clients
  type             transaction_type not null,
  amount           numeric(18,2) not null,
  currency         currency_type not null default 'USD',
  description      text not null,
  transaction_date date not null,
  status           transaction_status not null default 'COMPLETED',
  reference        text,
  notes            text,
  source_type      transaction_source_type not null default 'MANUAL',
  source_id        uuid,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_transactions_workspace_date   on public.transactions(workspace_id, transaction_date);
create index idx_transactions_workspace_type   on public.transactions(workspace_id, type, status);
create index idx_transactions_account_status   on public.transactions(account_id, status);
create index idx_transactions_category         on public.transactions(category_id);
create index idx_transactions_status           on public.transactions(status);
create index idx_transactions_created_at       on public.transactions(created_at);

create trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- ─── RPC: Dashboard summary ───────────────────────────────────
create or replace function public.get_workspace_balance(
  p_workspace_id uuid,
  p_from date,
  p_to   date
)
returns table (
  total_income   numeric,
  total_expenses numeric,
  balance        numeric
)
language sql stable security definer as $$
  select
    coalesce(sum(case when t.type = 'INCOME'  and t.status = 'COMPLETED' then t.amount else 0 end), 0) as total_income,
    coalesce(sum(case when t.type = 'EXPENSE' and t.status = 'COMPLETED' then t.amount else 0 end), 0) as total_expenses,
    coalesce(sum(case
      when t.type = 'INCOME'  and t.status = 'COMPLETED' then  t.amount
      when t.type = 'EXPENSE' and t.status = 'COMPLETED' then -t.amount
      else 0
    end), 0) as balance
  from public.transactions t
  where t.workspace_id = p_workspace_id
    and t.transaction_date between p_from and p_to;
$$;
