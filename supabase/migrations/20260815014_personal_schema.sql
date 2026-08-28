-- ============================================================
-- MIGRACIÓN 014: Tablas Purchase Items y Reminders
-- ============================================================

-- ─── Purchase Items ──────────────────────────────────────────
create table public.purchase_items (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid references public.workspaces(id) on delete cascade,
  title            text not null,
  description      text,
  category         text not null default 'Otros',
  estimated_amount numeric(18,2),
  currency         text not null default 'USD',
  priority         text not null default 'MEDIUM'
    check (priority in ('LOW','MEDIUM','HIGH','URGENT')),
  status           text not null default 'TODO'
    check (status in ('TODO','PLANNED','PURCHASED','CANCELLED')),
  due_date         date,
  reminder_date    date,
  is_recurring     boolean not null default false,
  recurrence       text,
  notes            text,
  completed_at     timestamptz,
  transaction_id   uuid references public.transactions(id),
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_purchase_items_workspace on public.purchase_items(workspace_id);
create index idx_purchase_items_status    on public.purchase_items(workspace_id, status);
create index idx_purchase_items_due_date  on public.purchase_items(due_date) where due_date is not null;

create trigger trg_purchase_items_updated_at
  before update on public.purchase_items
  for each row execute function public.set_updated_at();

-- ─── Reminders ───────────────────────────────────────────────
create table public.reminders (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references public.workspaces(id) on delete cascade,
  title         text not null,
  description   text,
  source_type   text not null default 'MANUAL'
    check (source_type in ('PURCHASE','PAYROLL','RECEIVABLE','DEBT','CASHEA','SAN','RECURRING_EXPENSE','MANUAL')),
  source_id     uuid,
  reminder_at   date not null,     -- ISO date (día del recordatorio)
  priority      text not null default 'MEDIUM'
    check (priority in ('LOW','MEDIUM','HIGH','URGENT')),
  status        text not null default 'PENDING'
    check (status in ('PENDING','COMPLETED','DISMISSED')),
  snoozed_until date,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index idx_reminders_workspace     on public.reminders(workspace_id);
create index idx_reminders_status        on public.reminders(workspace_id, status);
create index idx_reminders_reminder_at   on public.reminders(reminder_at);

create trigger trg_reminders_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();
