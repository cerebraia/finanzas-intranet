-- ============================================================
-- MIGRACIÓN 023: Tabla de transferencias entre cuentas
-- Crea public.transfers con RLS, RPC register_transfer,
-- RPC cancel_transfer y RPC get_account_balances que incluye
-- los movimientos de transferencias en el saldo de cada cuenta.
-- ============================================================

-- ─── 1. TABLA TRANSFERS ──────────────────────────────────────
create table public.transfers (
  id               uuid        primary key default gen_random_uuid(),
  workspace_id     uuid        not null references public.workspaces(id) on delete cascade,
  from_account_id  uuid        not null references public.accounts(id),
  to_account_id    uuid        not null references public.accounts(id),
  amount           numeric(18,2) not null check (amount > 0),
  currency         public.currency_type not null default 'USD',
  transfer_date    date        not null default current_date,
  reference        text,
  notes            text,
  created_by       uuid        references auth.users(id),
  created_at       timestamptz not null default now(),
  cancelled_at     timestamptz,
  constraint chk_different_accounts check (from_account_id != to_account_id)
);

create index on public.transfers(workspace_id, transfer_date);
create index on public.transfers(from_account_id) where cancelled_at is null;
create index on public.transfers(to_account_id)   where cancelled_at is null;

-- NOTE: transfers is an immutable-style table (cancel instead of update).
-- The set_updated_at trigger is registered for schema completeness but
-- UPDATE is blocked via RLS — only the cancel_transfer RPC (SECURITY DEFINER)
-- may write to cancelled_at.
create trigger trg_transfers_no_update
  before update on public.transfers
  for each row execute function public.set_updated_at();

-- ─── 2. RLS ──────────────────────────────────────────────────
alter table public.transfers enable row level security;

-- SELECT: workspace members can read transfers in their workspace
create policy "transfers_select" on public.transfers
  for select using (public.is_workspace_member(workspace_id));

-- INSERT: blocked — must go through register_transfer RPC
create policy "transfers_insert_blocked" on public.transfers
  for insert with check (false);

-- UPDATE: blocked — must go through cancel_transfer RPC
create policy "transfers_update_blocked" on public.transfers
  for update using (false);

-- DELETE: blocked
create policy "transfers_delete_blocked" on public.transfers
  for delete using (false);

-- ─── 3. RPC: register_transfer ───────────────────────────────
create or replace function public.register_transfer(
  p_workspace_id    uuid,
  p_from_account_id uuid,
  p_to_account_id   uuid,
  p_amount          numeric,
  p_currency        text  default 'USD',
  p_transfer_date   date  default current_date,
  p_reference       text  default null,
  p_notes           text  default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id      uuid := auth.uid();
  v_from_account record;
  v_to_account   record;
  v_transfer_id  uuid;
  v_currency     public.currency_type;
begin
  -- 1. Auth check
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  -- 2. Workspace membership check
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;

  -- 3. Amount validation
  if p_amount <= 0 then
    raise exception 'El monto debe ser mayor a cero';
  end if;

  -- 4. Accounts must differ
  if p_from_account_id = p_to_account_id then
    raise exception 'Las cuentas de origen y destino deben ser diferentes';
  end if;

  -- 5. Verify from_account belongs to workspace
  select * into v_from_account
    from public.accounts
   where id = p_from_account_id
     and workspace_id = p_workspace_id;
  if not found then
    raise exception 'La cuenta de origen no existe o no pertenece a este workspace';
  end if;

  -- 6. Verify to_account belongs to workspace
  select * into v_to_account
    from public.accounts
   where id = p_to_account_id
     and workspace_id = p_workspace_id;
  if not found then
    raise exception 'La cuenta de destino no existe o no pertenece a este workspace';
  end if;

  -- 7. Cast currency text to enum for comparison
  begin
    v_currency := p_currency::public.currency_type;
  exception when invalid_text_representation then
    raise exception 'Moneda no válida: %', p_currency;
  end;

  -- Verify same currency between accounts and amount
  if v_from_account.currency != v_currency or v_to_account.currency != v_currency then
    raise exception 'Las cuentas y el monto deben usar la misma moneda';
  end if;

  -- 8. Insert transfer
  insert into public.transfers(
    workspace_id, from_account_id, to_account_id,
    amount, currency, transfer_date, reference, notes, created_by
  ) values (
    p_workspace_id, p_from_account_id, p_to_account_id,
    p_amount, v_currency, p_transfer_date, p_reference, p_notes, v_user_id
  ) returning id into v_transfer_id;

  -- 9. Audit log
  perform public.log_audit(
    p_workspace_id, 'CREATE', 'transfer', v_transfer_id,
    jsonb_build_object(
      'from_account_id', p_from_account_id,
      'to_account_id',   p_to_account_id,
      'amount',          p_amount,
      'currency',        p_currency
    )
  );

  -- 10. Return result
  return jsonb_build_object('transfer_id', v_transfer_id);
end;
$$;

-- ─── 4. RPC: cancel_transfer ─────────────────────────────────
create or replace function public.cancel_transfer(
  p_workspace_id uuid,
  p_transfer_id  uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id  uuid := auth.uid();
  v_transfer record;
begin
  -- 1. Auth check
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  -- 2. Admin check (only admins can cancel transfers)
  if not public.is_workspace_admin(p_workspace_id) then
    raise exception 'Solo administradores pueden cancelar transferencias';
  end if;

  -- 3. Lock transfer FOR UPDATE
  select * into v_transfer
    from public.transfers
   where id = p_transfer_id
     and workspace_id = p_workspace_id
   for update;

  -- 4. Not found check
  if not found then
    raise exception 'Transferencia no encontrada';
  end if;

  -- 5. Already cancelled check
  if v_transfer.cancelled_at is not null then
    raise exception 'La transferencia ya está cancelada';
  end if;

  -- 6. Cancel
  update public.transfers
     set cancelled_at = now()
   where id = p_transfer_id;

  -- 7. Audit log
  perform public.log_audit(
    p_workspace_id, 'CANCEL', 'transfer', p_transfer_id,
    jsonb_build_object('cancelled_by', v_user_id)
  );

  -- 8. Return result
  return jsonb_build_object('cancelled', true);
end;
$$;

-- ─── 5. RPC: get_account_balances ────────────────────────────
create or replace function public.get_account_balances(
  p_workspace_id uuid
) returns table (
  account_id      uuid,
  account_name    text,
  account_type    text,
  currency        text,
  initial_balance numeric,
  current_balance numeric
)
language sql stable security definer set search_path = ''
as $$
  select
    a.id                  as account_id,
    a.name                as account_name,
    a.type::text          as account_type,
    a.currency::text      as currency,
    a.initial_balance,
    a.initial_balance
    + coalesce((
        select sum(t.amount)
          from public.transactions t
         where t.account_id = a.id
           and t.type = 'INCOME'
           and t.status = 'COMPLETED'
      ), 0)
    - coalesce((
        select sum(t.amount)
          from public.transactions t
         where t.account_id = a.id
           and t.type = 'EXPENSE'
           and t.status = 'COMPLETED'
      ), 0)
    + coalesce((
        select sum(tr.amount)
          from public.transfers tr
         where tr.to_account_id = a.id
           and tr.cancelled_at is null
      ), 0)
    - coalesce((
        select sum(tr.amount)
          from public.transfers tr
         where tr.from_account_id = a.id
           and tr.cancelled_at is null
      ), 0)
    as current_balance
  from public.accounts a
  where a.workspace_id = p_workspace_id
    and a.is_active = true
  order by a.created_at;
$$;

-- ─── Grants ──────────────────────────────────────────────────
do $$
declare
  fns text[] := array[
    'register_transfer(uuid,uuid,uuid,numeric,text,date,text,text)',
    'cancel_transfer(uuid,uuid)',
    'get_account_balances(uuid)'
  ];
  fn text;
begin
  foreach fn in array fns loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;
