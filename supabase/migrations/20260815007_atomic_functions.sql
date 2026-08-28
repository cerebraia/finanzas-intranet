-- ============================================================
-- MIGRACIÓN 007: Funciones atómicas para operaciones financieras
-- Ejecutar DESPUÉS de la migración 006
-- Todas las funciones son SECURITY DEFINER — validan auth.uid()
-- ============================================================

-- ─── Helper: insertar en audit_logs ──────────────────────────
create or replace function public.log_audit(
  p_workspace_id uuid,
  p_action       text,
  p_entity_type  text,
  p_entity_id    uuid,
  p_metadata     jsonb default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs(user_id, workspace_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_workspace_id, p_action, p_entity_type, p_entity_id, p_metadata);
exception when others then null; -- No fallar si audit falla
end;
$$;

-- ─── 1. REGISTER CLIENT PAYMENT (atómico) ────────────────────
-- Flujo: ClientPayment → actualizar Receivable → crear Transaction INCOME
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

  -- Bloquear receivable para evitar pagos concurrentes
  select * into strict v_receivable
  from public.receivables
  where id = p_receivable_id and workspace_id = p_workspace_id
  for update;

  if v_receivable.status in ('PAID', 'CANCELLED') then
    raise exception 'La cuenta por cobrar ya está cerrada (estado: %)', v_receivable.status;
  end if;

  -- Calcular nuevo estado
  v_new_paid := v_receivable.amount_paid + p_amount;
  if v_new_paid >= v_receivable.amount then
    v_new_paid   := v_receivable.amount;
    v_new_status := 'PAID';
  elsif v_new_paid > 0 then
    v_new_status := 'PARTIAL';
  else
    v_new_status := v_receivable.status;
  end if;

  -- Obtener categoría de ingresos del sistema
  select id into v_category_id from public.categories
  where name = 'Clientes' and is_system = true limit 1;
  if v_category_id is null then
    select id into v_category_id from public.categories
    where type = 'INCOME' and workspace_id is null limit 1;
  end if;
  if v_category_id is null then
    raise exception 'No se encontró categoría de ingresos del sistema';
  end if;

  -- Descripción de la transacción
  select name into v_client_name from public.clients where id = p_client_id;
  v_description := 'Cobro - ' || coalesce(v_client_name, 'Cliente') || ': ' || v_receivable.description;

  -- 1. Crear Transaction
  insert into public.transactions(
    workspace_id, account_id, category_id, client_id,
    type, amount, currency, description, transaction_date,
    status, source_type, source_id, created_by
  ) values (
    p_workspace_id, p_account_id, v_category_id, p_client_id,
    'INCOME', p_amount, p_currency, v_description, p_payment_date,
    'COMPLETED', 'CLIENT_PAYMENT', p_receivable_id, v_user_id
  ) returning id into v_transaction_id;

  -- 2. Crear ClientPayment
  insert into public.client_payments(
    workspace_id, client_id, receivable_id, account_id,
    amount, currency, payment_date, reference, notes, transaction_id, created_by
  ) values (
    p_workspace_id, p_client_id, p_receivable_id, p_account_id,
    p_amount, p_currency, p_payment_date, p_reference, p_notes, v_transaction_id, v_user_id
  ) returning id into v_payment_id;

  -- 3. Actualizar Receivable
  update public.receivables
  set amount_paid = v_new_paid, status = v_new_status, updated_at = now()
  where id = p_receivable_id;

  -- 4. Audit
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

-- ─── 2. CANCEL CLIENT PAYMENT (atómico) ──────────────────────
create or replace function public.cancel_client_payment(
  p_workspace_id uuid,
  p_payment_id   uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id     uuid := auth.uid();
  v_payment     record;
  v_receivable  record;
  v_new_paid    numeric;
  v_new_status  text;
begin
  if not public.is_workspace_admin(p_workspace_id) then
    raise exception 'Solo administradores pueden cancelar pagos';
  end if;

  select * into strict v_payment
  from public.client_payments
  where id = p_payment_id and workspace_id = p_workspace_id and cancelled = false
  for update;

  -- Cancelar la transacción asociada
  if v_payment.transaction_id is not null then
    update public.transactions set status = 'CANCELLED', updated_at = now()
    where id = v_payment.transaction_id;
  end if;

  -- Marcar pago como cancelado
  update public.client_payments set cancelled = true where id = p_payment_id;

  -- Recalcular amount_paid del receivable
  select coalesce(sum(amount), 0) into v_new_paid
  from public.client_payments
  where receivable_id = v_payment.receivable_id and cancelled = false;

  select * into v_receivable from public.receivables where id = v_payment.receivable_id;

  if v_new_paid >= v_receivable.amount then
    v_new_status := 'PAID';
  elsif v_new_paid > 0 then
    v_new_status := 'PARTIAL';
  else
    v_new_status := 'PENDING';
  end if;

  update public.receivables
  set amount_paid = v_new_paid, status = v_new_status, updated_at = now()
  where id = v_payment.receivable_id;

  perform public.log_audit(p_workspace_id, 'CANCEL', 'client_payment', p_payment_id, null);

  return jsonb_build_object('cancelled', true, 'receivable_status', v_new_status);
end;
$$;

-- ─── 3. REGISTER PAYROLL PAYMENT (atómico) ───────────────────
-- Flujo: PayrollPayment → actualizar Obligation → crear Transaction EXPENSE
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

  -- Bloquear obligación
  select * into strict v_obligation
  from public.payroll_obligations
  where id = p_obligation_id and workspace_id = p_workspace_id
  for update;

  if v_obligation.status in ('PAID', 'CANCELLED') then
    raise exception 'La obligación ya está cerrada';
  end if;

  v_new_paid := v_obligation.amount_paid + p_amount;
  if v_new_paid >= v_obligation.amount then
    v_new_paid   := v_obligation.amount;
    v_new_status := 'PAID';
  elsif v_new_paid > 0 then
    v_new_status := 'PARTIAL';
  else
    v_new_status := v_obligation.status;
  end if;

  -- Categoría de nómina
  select id into v_category_id from public.categories
  where name ilike '%nómina%' or name ilike '%nomina%' or name ilike '%equipo%'
  limit 1;
  if v_category_id is null then
    select id into v_category_id from public.categories
    where type = 'EXPENSE' and workspace_id is null limit 1;
  end if;

  select name into v_employee_name from public.employees where id = p_employee_id;

  -- 1. Crear Transaction
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

  -- 2. Crear PayrollPayment
  insert into public.payroll_payments(
    workspace_id, employee_id, payroll_obligation_id, account_id,
    amount, currency, payment_date, reference, notes, transaction_id, created_by
  ) values (
    p_workspace_id, p_employee_id, p_obligation_id, p_account_id,
    p_amount, p_currency, p_payment_date, p_reference, p_notes, v_transaction_id, v_user_id
  ) returning id into v_payment_id;

  -- 3. Actualizar Obligation
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

-- ─── 4. CANCEL PAYROLL PAYMENT (atómico) ─────────────────────
create or replace function public.cancel_payroll_payment(
  p_workspace_id uuid,
  p_payment_id   uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_payment     record;
  v_obligation  record;
  v_new_paid    numeric;
  v_new_status  text;
begin
  if not public.is_workspace_admin(p_workspace_id) then
    raise exception 'Solo administradores pueden cancelar pagos';
  end if;

  select * into strict v_payment
  from public.payroll_payments
  where id = p_payment_id and workspace_id = p_workspace_id and cancelled = false
  for update;

  if v_payment.transaction_id is not null then
    update public.transactions set status = 'CANCELLED', updated_at = now()
    where id = v_payment.transaction_id;
  end if;

  update public.payroll_payments set cancelled = true where id = p_payment_id;

  select coalesce(sum(amount), 0) into v_new_paid
  from public.payroll_payments
  where payroll_obligation_id = v_payment.payroll_obligation_id and cancelled = false;

  select * into v_obligation from public.payroll_obligations where id = v_payment.payroll_obligation_id;

  v_new_status := case
    when v_new_paid >= v_obligation.amount then 'PAID'
    when v_new_paid > 0 then 'PARTIAL'
    else 'PENDING'
  end;

  update public.payroll_obligations
  set amount_paid = v_new_paid, status = v_new_status, updated_at = now()
  where id = v_payment.payroll_obligation_id;

  return jsonb_build_object('cancelled', true, 'obligation_status', v_new_status);
end;
$$;

-- ─── 5. PAY RECURRING EXPENSE (atómico) ──────────────────────
create or replace function public.pay_recurring_expense(
  p_workspace_id         uuid,
  p_recurring_expense_id uuid,
  p_month                int,
  p_year                 int,
  p_account_id           uuid,
  p_payment_date         date default current_date,
  p_reference            text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id        uuid := auth.uid();
  v_expense        record;
  v_obligation     record;
  v_obligation_id  uuid;
  v_transaction_id uuid;
begin
  if v_user_id is null then raise exception 'No autenticado'; end if;
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;

  select * into strict v_expense
  from public.recurring_expenses
  where id = p_recurring_expense_id and workspace_id = p_workspace_id;

  if not v_expense.is_active then
    raise exception 'El gasto fijo está inactivo';
  end if;

  -- Obtener o verificar obligación del período
  select * into v_obligation
  from public.recurring_expense_obligations
  where recurring_expense_id = p_recurring_expense_id
    and period_month = p_month and period_year = p_year
  for update;

  if not found then
    raise exception 'No existe obligación para este período. Genera las obligaciones primero.';
  end if;

  if v_obligation.status = 'PAID' then
    raise exception 'Esta obligación ya fue pagada';
  end if;

  -- Crear Transaction
  insert into public.transactions(
    workspace_id, account_id, category_id,
    type, amount, currency, description, transaction_date,
    status, source_type, source_id, created_by
  ) values (
    p_workspace_id,
    coalesce(p_account_id, v_expense.default_account_id),
    v_expense.category_id,
    'EXPENSE', v_obligation.amount, v_expense.currency,
    'Gasto fijo: ' || v_expense.name, p_payment_date,
    'COMPLETED', 'RECURRING_EXPENSE', v_obligation.id, v_user_id
  ) returning id into v_transaction_id;

  -- Actualizar obligación
  update public.recurring_expense_obligations
  set status = 'PAID', transaction_id = v_transaction_id, updated_at = now()
  where id = v_obligation.id;

  perform public.log_audit(p_workspace_id, 'PAY', 'recurring_expense', v_obligation.id,
    jsonb_build_object('expense_name', v_expense.name, 'month', p_month, 'year', p_year));

  return jsonb_build_object(
    'obligation_id', v_obligation.id,
    'transaction_id', v_transaction_id,
    'status', 'PAID'
  );
end;
$$;

-- ─── 6. GENERATE MONTHLY RECEIVABLES ─────────────────────────
create or replace function public.generate_monthly_receivables(
  p_workspace_id uuid,
  p_month        int,
  p_year         int
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id    uuid := auth.uid();
  v_service    record;
  v_last_day   date;
  v_due_date   date;
  v_created    int := 0;
  v_skipped    int := 0;
  v_start      date;
  v_end        date;
  v_period_end date;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;

  v_start      := make_date(p_year, p_month, 1);
  v_end        := (v_start + interval '1 month' - interval '1 day')::date;
  v_last_day   := v_end;

  for v_service in
    select cs.*, c.name as client_name, s.name as service_name
    from public.client_services cs
    join public.clients c on c.id = cs.client_id
    join public.services s on s.id = cs.service_id
    where cs.workspace_id = p_workspace_id
      and cs.status = 'ACTIVE'
      and cs.billing_frequency = 'MONTHLY'
      and cs.start_date <= v_end
      and (cs.end_date is null or cs.end_date >= v_start)
  loop
    -- Comprobar si ya existe
    if exists (
      select 1 from public.receivables
      where client_service_id = v_service.id
        and period_month = p_month and period_year = p_year
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    -- Calcular due_date con clamp al último día del mes
    v_due_date := make_date(p_year, p_month, least(coalesce(v_service.billing_day, 1), extract(day from v_last_day)::int));

    insert into public.receivables(
      workspace_id, client_id, client_service_id,
      description, amount, currency, due_date,
      period_month, period_year, status
    ) values (
      p_workspace_id, v_service.client_id, v_service.id,
      v_service.service_name || ' — ' || to_char(v_start, 'Mon YYYY'),
      v_service.price, v_service.currency, v_due_date,
      p_month, p_year, 'PENDING'
    );

    v_created := v_created + 1;
  end loop;

  return jsonb_build_object('created', v_created, 'skipped', v_skipped, 'month', p_month, 'year', p_year);
end;
$$;

-- ─── 7. GENERATE PAYROLL OBLIGATIONS ─────────────────────────
create or replace function public.generate_payroll_obligations(
  p_workspace_id uuid,
  p_month        int,
  p_year         int
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_rule       record;
  v_last_day   date;
  v_due_date   date;
  v_created    int := 0;
  v_skipped    int := 0;
  v_month_start date;
  v_month_end   date;
  v_emp_name    text;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end   := (v_month_start + interval '1 month' - interval '1 day')::date;
  v_last_day    := v_month_end;

  for v_rule in
    select pr.*, e.name as employee_name
    from public.payroll_rules pr
    join public.employees e on e.id = pr.employee_id
    where pr.workspace_id = p_workspace_id
      and pr.status = 'ACTIVE'
      and pr.start_date <= v_month_end
      and (pr.end_date is null or pr.end_date >= v_month_start)
  loop
    v_emp_name := v_rule.employee_name;

    -- Pago principal
    if not exists (
      select 1 from public.payroll_obligations
      where payroll_rule_id = v_rule.id
        and period_month = p_month and period_year = p_year
    ) then
      v_due_date := make_date(p_year, p_month,
        least(v_rule.payment_day, extract(day from v_last_day)::int));

      insert into public.payroll_obligations(
        workspace_id, employee_id, payroll_rule_id,
        description, amount, currency, due_date,
        period_month, period_year, status
      ) values (
        p_workspace_id, v_rule.employee_id, v_rule.id,
        'Nómina ' || v_emp_name || ' — ' || to_char(v_month_start, 'Mon YYYY'),
        v_rule.amount, v_rule.currency, v_due_date,
        p_month, p_year, 'PENDING'
      );
      v_created := v_created + 1;
    else
      v_skipped := v_skipped + 1;
    end if;
  end loop;

  return jsonb_build_object('created', v_created, 'skipped', v_skipped, 'month', p_month, 'year', p_year);
end;
$$;

-- ─── 8. GENERATE RECURRING OBLIGATIONS ───────────────────────
create or replace function public.generate_recurring_obligations(
  p_workspace_id uuid,
  p_month        int,
  p_year         int
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_expense     record;
  v_last_day    date;
  v_due_date    date;
  v_created     int := 0;
  v_skipped     int := 0;
  v_month_start date;
  v_month_end   date;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end   := (v_month_start + interval '1 month' - interval '1 day')::date;
  v_last_day    := v_month_end;

  for v_expense in
    select * from public.recurring_expenses
    where workspace_id = p_workspace_id
      and is_active = true
      and frequency = 'MONTHLY'
      and start_date <= v_month_end
      and (end_date is null or end_date >= v_month_start)
  loop
    if exists (
      select 1 from public.recurring_expense_obligations
      where recurring_expense_id = v_expense.id
        and period_month = p_month and period_year = p_year
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_due_date := make_date(p_year, p_month,
      least(v_expense.payment_day, extract(day from v_last_day)::int));

    insert into public.recurring_expense_obligations(
      workspace_id, recurring_expense_id,
      amount, due_date, period_month, period_year, status
    ) values (
      p_workspace_id, v_expense.id,
      v_expense.amount, v_due_date, p_month, p_year, 'PENDING'
    );
    v_created := v_created + 1;
  end loop;

  return jsonb_build_object('created', v_created, 'skipped', v_skipped, 'month', p_month, 'year', p_year);
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────
do $$
declare
  fns text[] := array[
    'register_client_payment(uuid,uuid,uuid,uuid,numeric,text,date,text,text)',
    'cancel_client_payment(uuid,uuid)',
    'register_payroll_payment(uuid,uuid,uuid,uuid,numeric,text,date,text,text)',
    'cancel_payroll_payment(uuid,uuid)',
    'pay_recurring_expense(uuid,uuid,int,int,uuid,date,text)',
    'generate_monthly_receivables(uuid,int,int)',
    'generate_payroll_obligations(uuid,int,int)',
    'generate_recurring_obligations(uuid,int,int)'
  ];
  fn text;
begin
  foreach fn in array fns loop
    execute format('revoke all on function public.%s from public', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;
