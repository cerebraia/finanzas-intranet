-- ============================================================
-- MIGRACIÓN 022: Idempotency keys para pagos
-- Agrega columna idempotency_key a las tablas de pago y modifica
-- los RPCs de pago para devolver el resultado existente si ya
-- se procesó la misma clave en el mismo workspace.
-- ============================================================

-- ─── 1. COLUMNAS idempotency_key ─────────────────────────────

alter table public.client_payments
  add column if not exists idempotency_key text;

alter table public.payroll_payments
  add column if not exists idempotency_key text;

alter table public.debt_payments
  add column if not exists idempotency_key text;

-- ─── 2. ÍNDICES ÚNICOS PARCIALES (solo cuando not null) ──────

create unique index if not exists client_payments_idempotency_key
  on public.client_payments(workspace_id, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists payroll_payments_idempotency_key
  on public.payroll_payments(workspace_id, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists debt_payments_idempotency_key
  on public.debt_payments(workspace_id, idempotency_key)
  where idempotency_key is not null;

-- ─── 3. REGISTER CLIENT PAYMENT (con idempotency) ────────────
create or replace function public.register_client_payment(
  p_workspace_id    uuid,
  p_client_id       uuid,
  p_receivable_id   uuid,
  p_account_id      uuid,
  p_amount          numeric,
  p_currency        text    default 'USD',
  p_payment_date    date    default current_date,
  p_reference       text    default null,
  p_notes           text    default null,
  p_idempotency_key text    default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id        uuid := auth.uid();
  v_receivable     record;
  v_remaining      numeric;
  v_new_paid       numeric;
  v_new_status     text;
  v_transaction_id uuid;
  v_payment_id     uuid;
  v_category_id    uuid;
  v_client_name    text;
  v_description    text;
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

  -- 4. Idempotency check
  if p_idempotency_key is not null then
    select id, transaction_id
      into v_payment_id, v_transaction_id
      from public.client_payments
     where workspace_id = p_workspace_id
       and idempotency_key = p_idempotency_key
     limit 1;
    if found then
      return jsonb_build_object(
        'payment_id',     v_payment_id,
        'transaction_id', v_transaction_id,
        'idempotent',     true
      );
    end if;
  end if;

  -- 5. Lock receivable FOR UPDATE
  select * into strict v_receivable
    from public.receivables
   where id = p_receivable_id
     and workspace_id = p_workspace_id
   for update;

  -- 6. Status check
  if v_receivable.status in ('PAID', 'CANCELLED') then
    raise exception 'La cuenta por cobrar ya está cerrada (estado: %)', v_receivable.status;
  end if;

  -- 7. Calculate remaining and overpayment check
  v_remaining := v_receivable.amount - v_receivable.amount_paid;
  if p_amount > v_remaining then
    raise exception 'El monto excede el saldo pendiente de %', v_remaining::text;
  end if;

  -- 8-9. Calculate new paid amount and status
  v_new_paid := v_receivable.amount_paid + p_amount;
  if v_new_paid >= v_receivable.amount then
    v_new_paid   := v_receivable.amount;
    v_new_status := 'PAID';
  elsif v_new_paid > 0 then
    v_new_status := 'PARTIAL';
  else
    v_new_status := v_receivable.status;
  end if;

  -- 10. Get category
  select id into v_category_id
    from public.categories
   where name = 'Clientes' and is_system = true
   limit 1;
  if v_category_id is null then
    select id into v_category_id
      from public.categories
     where type = 'INCOME' and workspace_id is null
     limit 1;
  end if;
  if v_category_id is null then
    raise exception 'No se encontró categoría de ingresos del sistema';
  end if;

  -- 11. Get client name and build description
  select name into v_client_name
    from public.clients
   where id = p_client_id;
  v_description := 'Cobro - ' || coalesce(v_client_name, 'Cliente') || ': ' || v_receivable.description;

  -- 12. Insert transaction (p_amount is guaranteed <= remaining)
  insert into public.transactions(
    workspace_id, account_id, category_id, client_id,
    type, amount, currency, description, transaction_date,
    status, source_type, source_id, created_by
  ) values (
    p_workspace_id, p_account_id, v_category_id, p_client_id,
    'INCOME', p_amount, p_currency, v_description, p_payment_date,
    'COMPLETED', 'CLIENT_PAYMENT', p_receivable_id, v_user_id
  ) returning id into v_transaction_id;

  -- 13. Insert client_payment (with idempotency_key)
  insert into public.client_payments(
    workspace_id, client_id, receivable_id, account_id,
    amount, currency, payment_date, reference, notes,
    transaction_id, idempotency_key, created_by
  ) values (
    p_workspace_id, p_client_id, p_receivable_id, p_account_id,
    p_amount, p_currency, p_payment_date, p_reference, p_notes,
    v_transaction_id, p_idempotency_key, v_user_id
  ) returning id into v_payment_id;

  -- 14. Update receivable
  update public.receivables
     set amount_paid = v_new_paid,
         status      = v_new_status,
         updated_at  = now()
   where id = p_receivable_id;

  -- 15. Audit log
  perform public.log_audit(
    p_workspace_id, 'PAY', 'client_payment', v_payment_id,
    jsonb_build_object(
      'amount',          p_amount,
      'receivable_id',   p_receivable_id,
      'new_status',      v_new_status,
      'idempotency_key', p_idempotency_key
    )
  );

  -- 16. Return result
  return jsonb_build_object(
    'payment_id',       v_payment_id,
    'transaction_id',   v_transaction_id,
    'receivable_status', v_new_status,
    'amount_paid',      v_new_paid
  );
end;
$$;

-- ─── 4. REGISTER PAYROLL PAYMENT (con idempotency) ───────────
create or replace function public.register_payroll_payment(
  p_workspace_id        uuid,
  p_employee_id         uuid,
  p_obligation_id       uuid,
  p_account_id          uuid,
  p_amount              numeric,
  p_currency            text    default 'USD',
  p_payment_date        date    default current_date,
  p_reference           text    default null,
  p_notes               text    default null,
  p_idempotency_key     text    default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id        uuid := auth.uid();
  v_obligation     record;
  v_remaining      numeric;
  v_new_paid       numeric;
  v_new_status     text;
  v_transaction_id uuid;
  v_payment_id     uuid;
  v_category_id    uuid;
  v_employee_name  text;
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

  -- 4. Idempotency check
  if p_idempotency_key is not null then
    select id, transaction_id
      into v_payment_id, v_transaction_id
      from public.payroll_payments
     where workspace_id = p_workspace_id
       and idempotency_key = p_idempotency_key
     limit 1;
    if found then
      return jsonb_build_object(
        'payment_id',     v_payment_id,
        'transaction_id', v_transaction_id,
        'idempotent',     true
      );
    end if;
  end if;

  -- 5. Lock obligation FOR UPDATE
  select * into strict v_obligation
    from public.payroll_obligations
   where id = p_obligation_id
     and workspace_id = p_workspace_id
   for update;

  -- 6. Status check
  if v_obligation.status in ('PAID', 'CANCELLED') then
    raise exception 'La obligación ya está cerrada';
  end if;

  -- 7. Calculate remaining and overpayment check
  v_remaining := v_obligation.amount - v_obligation.amount_paid;
  if p_amount > v_remaining then
    raise exception 'El monto excede el saldo pendiente de %', v_remaining::text;
  end if;

  -- 8-9. Calculate new paid amount and status
  v_new_paid := v_obligation.amount_paid + p_amount;
  if v_new_paid >= v_obligation.amount then
    v_new_paid   := v_obligation.amount;
    v_new_status := 'PAID';
  elsif v_new_paid > 0 then
    v_new_status := 'PARTIAL';
  else
    v_new_status := v_obligation.status;
  end if;

  -- 10. Get category
  select id into v_category_id
    from public.categories
   where (name ilike '%nómina%' or name ilike '%nomina%' or name ilike '%equipo%')
   limit 1;
  if v_category_id is null then
    select id into v_category_id
      from public.categories
     where type = 'EXPENSE' and workspace_id is null
     limit 1;
  end if;

  -- 11. Get employee name
  select name into v_employee_name
    from public.employees
   where id = p_employee_id;

  -- 12. Insert transaction
  insert into public.transactions(
    workspace_id, account_id, category_id,
    type, amount, currency, description, transaction_date,
    status, source_type, source_id, created_by
  ) values (
    p_workspace_id, p_account_id, v_category_id,
    'EXPENSE', p_amount, p_currency,
    'Nómina: ' || coalesce(v_employee_name, 'Empleado'), p_payment_date,
    'COMPLETED', 'PAYROLL_PAYMENT', p_obligation_id, v_user_id
  ) returning id into v_transaction_id;

  -- 13. Insert payroll_payment (with idempotency_key)
  insert into public.payroll_payments(
    workspace_id, employee_id, payroll_obligation_id, account_id,
    amount, currency, payment_date, reference, notes,
    transaction_id, idempotency_key, created_by
  ) values (
    p_workspace_id, p_employee_id, p_obligation_id, p_account_id,
    p_amount, p_currency, p_payment_date, p_reference, p_notes,
    v_transaction_id, p_idempotency_key, v_user_id
  ) returning id into v_payment_id;

  -- 14. Update obligation
  update public.payroll_obligations
     set amount_paid = v_new_paid,
         status      = v_new_status,
         updated_at  = now()
   where id = p_obligation_id;

  -- 15. Audit log
  perform public.log_audit(
    p_workspace_id, 'PAY', 'payroll_payment', v_payment_id,
    jsonb_build_object(
      'amount',          p_amount,
      'employee_id',     p_employee_id,
      'obligation_id',   p_obligation_id,
      'idempotency_key', p_idempotency_key
    )
  );

  -- 16. Return result
  return jsonb_build_object(
    'payment_id',       v_payment_id,
    'transaction_id',   v_transaction_id,
    'obligation_status', v_new_status
  );
end;
$$;

-- ─── 5. REGISTER DEBT PAYMENT (con idempotency) ──────────────
create or replace function public.register_debt_payment(
  p_workspace_id    uuid,
  p_debt_id         uuid,
  p_installment_id  uuid,
  p_account_id      uuid,
  p_amount          numeric,
  p_currency        text    default 'USD',
  p_payment_date    date    default current_date,
  p_reference       text    default null,
  p_notes           text    default null,
  p_idempotency_key text    default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id        uuid := auth.uid();
  v_debt           record;
  v_installment    record;
  v_remaining      numeric;
  v_new_paid       numeric;
  v_new_status     text;
  v_transaction_id uuid;
  v_payment_id     uuid;
  v_category_id    uuid;
  v_tx_type        text;
  v_description    text;
  v_all_paid       boolean;
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

  -- 4. Idempotency check
  if p_idempotency_key is not null then
    select id, transaction_id
      into v_payment_id, v_transaction_id
      from public.debt_payments
     where workspace_id = p_workspace_id
       and idempotency_key = p_idempotency_key
     limit 1;
    if found then
      return jsonb_build_object(
        'payment_id',     v_payment_id,
        'transaction_id', v_transaction_id,
        'idempotent',     true
      );
    end if;
  end if;

  -- 5. Lock installment FOR UPDATE
  select * into strict v_installment
    from public.debt_installments
   where id = p_installment_id
     and workspace_id = p_workspace_id
   for update;

  -- 6. Status check
  if v_installment.status in ('PAID', 'CANCELLED') then
    raise exception 'La cuota ya está cerrada';
  end if;

  -- Load debt record
  select * into strict v_debt
    from public.debts
   where id = p_debt_id
     and workspace_id = p_workspace_id;

  -- Determine transaction type based on debt kind
  v_tx_type := case
    when v_debt.type = 'SAN' and v_debt.san_direction = 'RECEIVABLE' then 'INCOME'
    else 'EXPENSE'
  end;

  -- Select category
  if v_tx_type = 'EXPENSE' then
    select id into v_category_id
      from public.categories
     where (name ilike '%deuda%' or name ilike '%cuota%') and workspace_id is null
     limit 1;
    if v_category_id is null then
      select id into v_category_id
        from public.categories
       where type = 'EXPENSE' and workspace_id is null
       limit 1;
    end if;
  else
    select id into v_category_id
      from public.categories
     where type = 'INCOME' and workspace_id is null
     limit 1;
  end if;

  -- Build description
  v_description := case
    when v_debt.type = 'SAN' and v_debt.san_direction = 'RECEIVABLE'
    then 'SAN cobrado: ' || v_debt.name || ' — Cuota ' || v_installment.installment_number
    else v_debt.type || ' — ' || v_debt.name || ' Cuota ' || v_installment.installment_number
  end;

  -- 7. Calculate remaining and overpayment check
  v_remaining := v_installment.amount - v_installment.amount_paid;
  if p_amount > v_remaining then
    raise exception 'El monto excede el saldo pendiente de %', v_remaining::text;
  end if;

  -- 8-9. Calculate new paid amount and status
  v_new_paid := v_installment.amount_paid + p_amount;
  if v_new_paid >= v_installment.amount then
    v_new_paid   := v_installment.amount;
    v_new_status := 'PAID';
  elsif v_new_paid > 0 then
    v_new_status := 'PARTIAL';
  else
    v_new_status := v_installment.status;
  end if;

  -- 10. Insert transaction
  insert into public.transactions(
    workspace_id, account_id, category_id,
    type, amount, currency, description, transaction_date,
    status, source_type, source_id, created_by
  ) values (
    p_workspace_id, p_account_id, v_category_id,
    v_tx_type, p_amount, p_currency, v_description, p_payment_date,
    'COMPLETED', 'DEBT_PAYMENT', p_installment_id, v_user_id
  ) returning id into v_transaction_id;

  -- 11. Insert debt_payment (with idempotency_key)
  insert into public.debt_payments(
    workspace_id, debt_id, installment_id, account_id,
    amount, currency, payment_date, reference, notes,
    transaction_id, idempotency_key, created_by
  ) values (
    p_workspace_id, p_debt_id, p_installment_id, p_account_id,
    p_amount, p_currency, p_payment_date, p_reference, p_notes,
    v_transaction_id, p_idempotency_key, v_user_id
  ) returning id into v_payment_id;

  -- 12. Update installment
  update public.debt_installments
     set amount_paid = v_new_paid,
         status      = v_new_status,
         updated_at  = now()
   where id = p_installment_id;

  -- 13. If all installments paid, close debt
  select not exists (
    select 1 from public.debt_installments
     where debt_id = p_debt_id
       and status not in ('PAID', 'CANCELLED')
  ) into v_all_paid;

  if v_all_paid then
    update public.debts
       set status     = 'PAID',
           updated_at = now()
     where id = p_debt_id;
  end if;

  -- 14. Audit log
  perform public.log_audit(
    p_workspace_id, 'PAY', 'debt_payment', v_payment_id,
    jsonb_build_object(
      'amount',          p_amount,
      'debt_id',         p_debt_id,
      'installment_id',  p_installment_id,
      'idempotency_key', p_idempotency_key
    )
  );

  -- 15. Return result
  return jsonb_build_object(
    'payment_id',        v_payment_id,
    'transaction_id',    v_transaction_id,
    'installment_status', v_new_status,
    'debt_closed',       v_all_paid
  );
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────
do $$
declare
  fns text[] := array[
    'register_client_payment(uuid,uuid,uuid,uuid,numeric,text,date,text,text,text)',
    'register_payroll_payment(uuid,uuid,uuid,uuid,numeric,text,date,text,text,text)',
    'register_debt_payment(uuid,uuid,uuid,uuid,numeric,text,date,text,text,text)'
  ];
  fn text;
begin
  foreach fn in array fns loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;
