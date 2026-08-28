-- ============================================================
-- MIGRACIÓN 016: RPCs atómicas para Deudas
-- SECURITY DEFINER + set search_path = ''
-- ============================================================

-- ─── 1. Crear deuda + generar cuotas (atómico) ───────────────
create or replace function public.create_debt_with_installments(
  p_workspace_id    uuid,
  p_name            text,
  p_type            text,
  p_original_amount numeric,
  p_down_payment    numeric,
  p_financed_amount numeric,
  p_installments    int,
  p_monthly_amount  numeric,
  p_start_date      date,
  p_currency        text        default 'USD',
  p_provider        text        default null,
  p_description     text        default null,
  p_san_direction   text        default null,
  p_notes           text        default null
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id      uuid := auth.uid();
  v_debt_id      uuid;
  v_amount_per   numeric(18,2);
  v_last_amount  numeric(18,2);
  v_total_gen    numeric(18,2);
  v_due_date     date;
  i              int;
begin
  if v_user_id is null then raise exception 'No autenticado'; end if;
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;
  if p_installments <= 0 then
    raise exception 'El número de cuotas debe ser mayor a cero';
  end if;
  if p_financed_amount <= 0 then
    raise exception 'El monto financiado debe ser mayor a cero';
  end if;

  -- Crear deuda
  insert into public.debts(
    workspace_id, name, type, san_direction,
    original_amount, down_payment, financed_amount,
    installments, monthly_amount, currency,
    start_date, status, provider, description, notes, created_by
  ) values (
    p_workspace_id, p_name, p_type, p_san_direction,
    p_original_amount, p_down_payment, p_financed_amount,
    p_installments, p_monthly_amount, p_currency,
    p_start_date, 'ACTIVE', p_provider, p_description, p_notes, v_user_id
  ) returning id into v_debt_id;

  -- Calcular monto por cuota (truncar a 2 decimales)
  v_amount_per := trunc(p_financed_amount / p_installments, 2);
  v_total_gen  := v_amount_per * p_installments;
  -- La última cuota absorbe la diferencia de centavos
  v_last_amount := p_financed_amount - (v_amount_per * (p_installments - 1));

  -- Generar cuotas
  for i in 1..p_installments loop
    v_due_date := p_start_date + ((i - 1) * interval '1 month')::interval;

    insert into public.debt_installments(
      workspace_id, debt_id, installment_number,
      amount, due_date, status
    ) values (
      p_workspace_id, v_debt_id, i,
      case when i = p_installments then v_last_amount else v_amount_per end,
      v_due_date, 'PENDING'
    );
  end loop;

  perform public.log_audit(p_workspace_id, 'CREATE', 'debt', v_debt_id,
    jsonb_build_object('name', p_name, 'type', p_type, 'amount', p_financed_amount));

  return v_debt_id;
end;
$$;

-- ─── 2. Registrar pago de cuota (atómico) ────────────────────
-- Maneja EXPENSE para deudas normales, INCOME para SAN RECEIVABLE
create or replace function public.register_debt_payment(
  p_workspace_id   uuid,
  p_debt_id        uuid,
  p_installment_id uuid,
  p_account_id     uuid,
  p_amount         numeric,
  p_currency       text   default 'USD',
  p_payment_date   date   default current_date,
  p_reference      text   default null,
  p_notes          text   default null
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id        uuid := auth.uid();
  v_debt           record;
  v_installment    record;
  v_new_paid       numeric;
  v_new_status     text;
  v_transaction_id uuid;
  v_payment_id     uuid;
  v_category_id    uuid;
  v_tx_type        text;
  v_description    text;
  v_all_paid       boolean;
begin
  if v_user_id is null then raise exception 'No autenticado'; end if;
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;
  if p_amount <= 0 then raise exception 'El monto debe ser mayor a cero'; end if;

  -- Bloquear cuota
  select * into strict v_installment
  from public.debt_installments
  where id = p_installment_id and workspace_id = p_workspace_id
  for update;

  if v_installment.status in ('PAID','CANCELLED') then
    raise exception 'La cuota ya está cerrada';
  end if;

  -- Obtener deuda
  select * into strict v_debt
  from public.debts
  where id = p_debt_id and workspace_id = p_workspace_id;

  -- Determinar tipo de transacción
  -- SAN RECEIVABLE → INCOME (recibimos dinero)
  -- Todo lo demás → EXPENSE (pagamos dinero)
  v_tx_type := case
    when v_debt.type = 'SAN' and v_debt.san_direction = 'RECEIVABLE' then 'INCOME'
    else 'EXPENSE'
  end;

  -- Categoría apropiada
  if v_tx_type = 'EXPENSE' then
    select id into v_category_id from public.categories
    where (name ilike '%deuda%' or name ilike '%cuota%') and workspace_id is null
    limit 1;
    if v_category_id is null then
      select id into v_category_id from public.categories
      where type = 'EXPENSE' and workspace_id is null limit 1;
    end if;
  else
    select id into v_category_id from public.categories
    where type = 'INCOME' and workspace_id is null limit 1;
  end if;

  v_description := case
    when v_debt.type = 'SAN' and v_debt.san_direction = 'RECEIVABLE'
    then 'SAN cobrado: ' || v_debt.name || ' — Cuota ' || v_installment.installment_number
    else v_debt.type || ' — ' || v_debt.name || ' Cuota ' || v_installment.installment_number
  end;

  -- Calcular nuevo estado de cuota
  v_new_paid := v_installment.amount_paid + p_amount;
  if v_new_paid >= v_installment.amount then
    v_new_paid   := v_installment.amount;
    v_new_status := 'PAID';
  elsif v_new_paid > 0 then
    v_new_status := 'PARTIAL';
  else
    v_new_status := v_installment.status;
  end if;

  -- Crear Transaction
  insert into public.transactions(
    workspace_id, account_id, category_id,
    type, amount, currency, description, transaction_date,
    status, source_type, source_id, created_by
  ) values (
    p_workspace_id, p_account_id, v_category_id,
    v_tx_type, p_amount, p_currency, v_description, p_payment_date,
    'COMPLETED', 'DEBT_PAYMENT', p_installment_id, v_user_id
  ) returning id into v_transaction_id;

  -- Crear DebtPayment
  insert into public.debt_payments(
    workspace_id, debt_id, installment_id, account_id,
    amount, currency, payment_date, reference, notes,
    transaction_id, created_by
  ) values (
    p_workspace_id, p_debt_id, p_installment_id, p_account_id,
    p_amount, p_currency, p_payment_date, p_reference, p_notes,
    v_transaction_id, v_user_id
  ) returning id into v_payment_id;

  -- Actualizar cuota
  update public.debt_installments
  set amount_paid = v_new_paid, status = v_new_status, updated_at = now()
  where id = p_installment_id;

  -- Verificar si todas las cuotas están pagadas → marcar deuda como PAID
  select not exists (
    select 1 from public.debt_installments
    where debt_id = p_debt_id
      and status not in ('PAID','CANCELLED')
  ) into v_all_paid;

  if v_all_paid then
    update public.debts
    set status = 'PAID', updated_at = now()
    where id = p_debt_id;
  end if;

  perform public.log_audit(p_workspace_id, 'PAY', 'debt_payment', v_payment_id,
    jsonb_build_object('amount', p_amount, 'debt_id', p_debt_id, 'installment', v_installment.installment_number));

  return jsonb_build_object(
    'payment_id',          v_payment_id,
    'transaction_id',      v_transaction_id,
    'installment_status',  v_new_status,
    'debt_paid',           v_all_paid
  );
end;
$$;

-- ─── 3. Cancelar pago (atómico) ──────────────────────────────
create or replace function public.cancel_debt_payment(
  p_workspace_id uuid,
  p_payment_id   uuid
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_payment     record;
  v_installment record;
  v_new_paid    numeric;
  v_new_status  text;
begin
  if not public.is_workspace_admin(p_workspace_id) then
    raise exception 'Solo administradores pueden cancelar pagos';
  end if;

  select * into strict v_payment
  from public.debt_payments
  where id = p_payment_id and workspace_id = p_workspace_id and cancelled = false
  for update;

  if v_payment.transaction_id is not null then
    update public.transactions set status = 'CANCELLED', updated_at = now()
    where id = v_payment.transaction_id;
  end if;

  update public.debt_payments set cancelled = true where id = p_payment_id;

  -- Recalcular
  select coalesce(sum(amount), 0) into v_new_paid
  from public.debt_payments
  where installment_id = v_payment.installment_id and cancelled = false;

  select * into v_installment from public.debt_installments where id = v_payment.installment_id;

  v_new_status := case
    when v_new_paid >= v_installment.amount then 'PAID'
    when v_new_paid > 0 then 'PARTIAL'
    else 'PENDING'
  end;

  update public.debt_installments
  set amount_paid = v_new_paid, status = v_new_status, updated_at = now()
  where id = v_payment.installment_id;

  -- Si la deuda estaba marcada PAID, volver a ACTIVE
  update public.debts
  set status = 'ACTIVE', updated_at = now()
  where id = v_payment.debt_id and status = 'PAID';

  return jsonb_build_object('cancelled', true, 'installment_status', v_new_status);
end;
$$;

-- ─── 4. Commitment Summary ───────────────────────────────────
create or replace function public.get_commitment_summary(
  p_workspace_id uuid
)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_total_balance      numeric;
  v_total_debt         numeric;
  v_payroll            numeric;
  v_recurring          numeric;
  v_debt_this_month    numeric;
  v_month_start        date;
  v_month_end          date;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;

  v_month_start := date_trunc('month', current_date)::date;
  v_month_end   := (date_trunc('month', current_date) + interval '1 month' - interval '1 day')::date;

  -- Saldo total de cuentas (saldo inicial + movimientos completados)
  select coalesce((
    select sum(a.initial_balance)
    from public.accounts a
    where a.workspace_id = p_workspace_id and a.is_active = true
  ), 0)
  + coalesce((
    select sum(case when t.type='INCOME' then t.amount else -t.amount end)
    from public.transactions t
    where t.workspace_id = p_workspace_id
      and t.status = 'COMPLETED'
      and t.type in ('INCOME','EXPENSE')
  ), 0)
  into v_total_balance;

  -- Deuda total pendiente (cuotas activas)
  select coalesce(sum(di.amount - di.amount_paid), 0)
  into v_total_debt
  from public.debt_installments di
  join public.debts d on d.id = di.debt_id
  where di.workspace_id = p_workspace_id
    and di.status in ('PENDING','PARTIAL')
    and d.status = 'ACTIVE'
    and (d.type != 'SAN' or d.san_direction = 'PAYABLE' or d.san_direction is null);

  -- Nómina pendiente este mes
  select coalesce(sum(amount - amount_paid), 0)
  into v_payroll
  from public.payroll_obligations
  where workspace_id = p_workspace_id
    and status in ('PENDING','PARTIAL')
    and due_date between v_month_start and v_month_end;

  -- Gastos recurrentes pendientes este mes
  select coalesce(sum(amount), 0)
  into v_recurring
  from public.recurring_expense_obligations
  where workspace_id = p_workspace_id
    and status = 'PENDING'
    and due_date between v_month_start and v_month_end;

  -- Cuotas de deuda que vencen este mes
  select coalesce(sum(di.amount - di.amount_paid), 0)
  into v_debt_this_month
  from public.debt_installments di
  join public.debts d on d.id = di.debt_id
  where di.workspace_id = p_workspace_id
    and di.status in ('PENDING','PARTIAL')
    and di.due_date between v_month_start and v_month_end
    and d.status = 'ACTIVE'
    and (d.type != 'SAN' or d.san_direction = 'PAYABLE' or d.san_direction is null);

  return jsonb_build_object(
    'totalBalance',       v_total_balance,
    'totalDebt',          v_total_debt,
    'payrollCommitment',  v_payroll,
    'recurringCommitment', v_recurring,
    'currentInstallments', v_debt_this_month,
    'monthlyCommitted',   v_payroll + v_recurring + v_debt_this_month,
    'realAvailable',      v_total_balance - (v_payroll + v_recurring + v_debt_this_month)
  );
end;
$$;

-- ─── 5. Purchase → Transaction (atómico) ─────────────────────
create or replace function public.complete_purchase_as_expense(
  p_workspace_id   uuid,
  p_purchase_id    uuid,
  p_account_id     uuid,
  p_category_id    uuid,
  p_amount         numeric,
  p_description    text,
  p_date           date default current_date
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id        uuid := auth.uid();
  v_transaction_id uuid;
begin
  if v_user_id is null then raise exception 'No autenticado'; end if;
  if p_amount <= 0 then raise exception 'El monto debe ser mayor a cero'; end if;

  -- Verificar acceso al purchase_item
  if not exists (
    select 1 from public.purchase_items
    where id = p_purchase_id
      and (
        (workspace_id is null and created_by = v_user_id)
        or (workspace_id is not null and public.is_workspace_member(workspace_id))
      )
  ) then
    raise exception 'Sin acceso a este item';
  end if;

  -- Crear Transaction EXPENSE
  insert into public.transactions(
    workspace_id, account_id, category_id,
    type, amount, currency, description, transaction_date,
    status, source_type, source_id, created_by
  ) values (
    p_workspace_id, p_account_id, p_category_id,
    'EXPENSE', p_amount, 'USD', p_description, p_date,
    'COMPLETED', 'PURCHASE', p_purchase_id, v_user_id
  ) returning id into v_transaction_id;

  -- Marcar purchase como PURCHASED
  update public.purchase_items
  set status = 'PURCHASED',
      transaction_id = v_transaction_id,
      completed_at   = now(),
      updated_at     = now()
  where id = p_purchase_id;

  perform public.log_audit(
    p_workspace_id, 'PURCHASE', 'purchase_item', p_purchase_id,
    jsonb_build_object('amount', p_amount, 'transaction_id', v_transaction_id)
  );

  return jsonb_build_object(
    'transaction_id', v_transaction_id,
    'purchase_id',    p_purchase_id,
    'status',         'PURCHASED'
  );
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────
do $$
declare
  fns text[] := array[
    'create_debt_with_installments(uuid,text,text,numeric,numeric,numeric,int,numeric,date,text,text,text,text,text)',
    'register_debt_payment(uuid,uuid,uuid,uuid,numeric,text,date,text,text)',
    'cancel_debt_payment(uuid,uuid)',
    'get_commitment_summary(uuid)',
    'complete_purchase_as_expense(uuid,uuid,uuid,uuid,numeric,text,date)'
  ];
  fn text;
begin
  foreach fn in array fns loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;
