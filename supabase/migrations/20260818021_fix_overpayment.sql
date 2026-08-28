-- ============================================================
-- MIGRACIÓN 021: Corrección overpayment en RPCs de pago
-- Regla: RECHAZAR con excepción si el monto supera el pendiente.
-- NO clampear silenciosamente — eso crearía phantom transactions.
-- ============================================================

-- ─── 1. REGISTER CLIENT PAYMENT (corregido) ──────────────────
create or replace function public.register_client_payment(
  p_workspace_id  uuid,
  p_client_id     uuid,
  p_receivable_id uuid,
  p_account_id    uuid,
  p_amount        numeric,
  p_currency      text default 'USD',
  p_payment_date  date default current_date,
  p_reference     text default null,
  p_notes         text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
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
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;
  if p_amount <= 0 then
    raise exception 'El monto debe ser mayor a cero';
  end if;

  select * into strict v_receivable
  from public.receivables
  where id = p_receivable_id and workspace_id = p_workspace_id
  for update;

  if v_receivable.status in ('PAID', 'CANCELLED') then
    raise exception 'La cuenta por cobrar ya está cerrada (estado: %)', v_receivable.status;
  end if;

  v_remaining := v_receivable.amount - v_receivable.amount_paid;
  if p_amount > v_remaining then
    raise exception 'El monto excede el saldo pendiente de %', v_remaining;
  end if;

  v_new_paid   := v_receivable.amount_paid + p_amount;
  v_new_status := case
    when v_new_paid >= v_receivable.amount then 'PAID'
    when v_new_paid > 0 then 'PARTIAL'
    else v_receivable.status
  end;

  select id into v_category_id from public.categories
  where name = 'Clientes' and is_system = true limit 1;
  if v_category_id is null then
    select id into v_category_id from public.categories
    where type = 'INCOME' and workspace_id is null limit 1;
  end if;
  if v_category_id is null then
    raise exception 'No se encontró categoría de ingresos del sistema';
  end if;

  select name into v_client_name from public.clients where id = p_client_id;
  v_description := 'Cobro - ' || coalesce(v_client_name, 'Cliente') || ': ' || v_receivable.description;

  insert into public.transactions(
    workspace_id, account_id, category_id, client_id,
    type, amount, currency, description, transaction_date,
    status, source_type, source_id, created_by
  ) values (
    p_workspace_id, p_account_id, v_category_id, p_client_id,
    'INCOME', p_amount, p_currency, v_description, p_payment_date,
    'COMPLETED', 'CLIENT_PAYMENT', p_receivable_id, v_user_id
  ) returning id into v_transaction_id;

  insert into public.client_payments(
    workspace_id, client_id, receivable_id, account_id,
    amount, currency, payment_date, reference, notes, transaction_id, created_by
  ) values (
    p_workspace_id, p_client_id, p_receivable_id, p_account_id,
    p_amount, p_currency, p_payment_date, p_reference, p_notes, v_transaction_id, v_user_id
  ) returning id into v_payment_id;

  update public.receivables
  set amount_paid = v_new_paid, status = v_new_status, updated_at = now()
  where id = p_receivable_id;

  perform public.log_audit(p_workspace_id, 'PAY', 'client_payment', v_payment_id,
    jsonb_build_object('amount', p_amount, 'receivable_id', p_receivable_id, 'new_status', v_new_status));

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'transaction_id', v_transaction_id,
    'receivable_status', v_new_status,
    'amount_paid', v_new_paid
  );
end;
$$;

-- ─── 2. REGISTER PAYROLL PAYMENT (corregido) ─────────────────
create or replace function public.register_payroll_payment(
  p_workspace_id        uuid,
  p_employee_id         uuid,
  p_obligation_id       uuid,
  p_account_id          uuid,
  p_amount              numeric,
  p_currency            text default 'USD',
  p_payment_date        date default current_date,
  p_reference           text default null,
  p_notes               text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
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
  if v_user_id is null then raise exception 'No autenticado'; end if;
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;
  if p_amount <= 0 then raise exception 'El monto debe ser mayor a cero'; end if;

  select * into strict v_obligation
  from public.payroll_obligations
  where id = p_obligation_id and workspace_id = p_workspace_id
  for update;

  if v_obligation.status in ('PAID', 'CANCELLED') then
    raise exception 'La obligación ya está cerrada';
  end if;

  v_remaining := v_obligation.amount - v_obligation.amount_paid;
  if p_amount > v_remaining then
    raise exception 'El monto excede el saldo pendiente de %', v_remaining;
  end if;

  v_new_paid   := v_obligation.amount_paid + p_amount;
  v_new_status := case
    when v_new_paid >= v_obligation.amount then 'PAID'
    when v_new_paid > 0 then 'PARTIAL'
    else v_obligation.status
  end;

  select id into v_category_id from public.categories
  where name ilike '%nómina%' or name ilike '%nomina%' or name ilike '%equipo%'
  limit 1;
  if v_category_id is null then
    select id into v_category_id from public.categories
    where type = 'EXPENSE' and workspace_id is null limit 1;
  end if;

  select name into v_employee_name from public.employees where id = p_employee_id;

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

  insert into public.payroll_payments(
    workspace_id, employee_id, payroll_obligation_id, account_id,
    amount, currency, payment_date, reference, notes, transaction_id, created_by
  ) values (
    p_workspace_id, p_employee_id, p_obligation_id, p_account_id,
    p_amount, p_currency, p_payment_date, p_reference, p_notes, v_transaction_id, v_user_id
  ) returning id into v_payment_id;

  update public.payroll_obligations
  set amount_paid = v_new_paid, status = v_new_status, updated_at = now()
  where id = p_obligation_id;

  perform public.log_audit(p_workspace_id, 'PAY', 'payroll_payment', v_payment_id,
    jsonb_build_object('amount', p_amount, 'employee_id', p_employee_id, 'obligation_id', p_obligation_id));

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'transaction_id', v_transaction_id,
    'obligation_status', v_new_status
  );
end;
$$;

-- ─── 3. REGISTER DEBT PAYMENT (corregido) ────────────────────
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
  if v_user_id is null then raise exception 'No autenticado'; end if;
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;
  if p_amount <= 0 then raise exception 'El monto debe ser mayor a cero'; end if;

  select * into strict v_installment
  from public.debt_installments
  where id = p_installment_id and workspace_id = p_workspace_id
  for update;

  if v_installment.status in ('PAID','CANCELLED') then
    raise exception 'La cuota ya está cerrada';
  end if;

  v_remaining := v_installment.amount - v_installment.amount_paid;
  if p_amount > v_remaining then
    raise exception 'El monto excede el saldo pendiente de %', v_remaining;
  end if;

  select * into strict v_debt
  from public.debts
  where id = p_debt_id and workspace_id = p_workspace_id;

  v_tx_type := case
    when v_debt.type = 'SAN' and v_debt.san_direction = 'RECEIVABLE' then 'INCOME'
    else 'EXPENSE'
  end;

  if v_tx_type = 'EXPENSE' then
    select id into v_category_id from public.categories
    where (name ilike '%deuda%' or name ilike '%cuota%') and workspace_id is null limit 1;
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

  v_new_paid   := v_installment.amount_paid + p_amount;
  v_new_status := case
    when v_new_paid >= v_installment.amount then 'PAID'
    when v_new_paid > 0 then 'PARTIAL'
    else v_installment.status
  end;

  insert into public.transactions(
    workspace_id, account_id, category_id,
    type, amount, currency, description, transaction_date,
    status, source_type, source_id, created_by
  ) values (
    p_workspace_id, p_account_id, v_category_id,
    v_tx_type, p_amount, p_currency, v_description, p_payment_date,
    'COMPLETED', 'DEBT_PAYMENT', p_installment_id, v_user_id
  ) returning id into v_transaction_id;

  insert into public.debt_payments(
    workspace_id, debt_id, installment_id, account_id,
    amount, currency, payment_date, reference, notes,
    transaction_id, created_by
  ) values (
    p_workspace_id, p_debt_id, p_installment_id, p_account_id,
    p_amount, p_currency, p_payment_date, p_reference, p_notes,
    v_transaction_id, v_user_id
  ) returning id into v_payment_id;

  update public.debt_installments
  set amount_paid = v_new_paid, status = v_new_status, updated_at = now()
  where id = p_installment_id;

  select not exists (
    select 1 from public.debt_installments
    where debt_id = p_debt_id and status not in ('PAID','CANCELLED')
  ) into v_all_paid;

  if v_all_paid then
    update public.debts set status = 'PAID', updated_at = now() where id = p_debt_id;
  end if;

  perform public.log_audit(p_workspace_id, 'PAY', 'debt_payment', v_payment_id,
    jsonb_build_object('amount', p_amount, 'debt_id', p_debt_id, 'installment_id', p_installment_id));

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'transaction_id', v_transaction_id,
    'installment_status', v_new_status,
    'debt_closed', v_all_paid
  );
end;
$$;
