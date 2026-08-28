-- ============================================================
-- MIGRACIÓN 009: Hardening de seguridad en funciones SECURITY DEFINER
-- Ejecutar DESPUÉS de las migraciones 001-008
--
-- Problema: todas las funciones anteriores usan `set search_path = public`
-- Fix: usar `set search_path = ''` + nombres de esquema explícitos
-- Referencia: Supabase Security Advisor - mutable_search_path
-- ============================================================

-- ─── 1. Funciones helper de autorización ─────────────────────

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(p_workspace_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
      and role in ('OWNER', 'ADMIN')
  );
$$;

-- ─── 2. Trigger de creación de profile ───────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
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

-- ─── 3. Provisioning de workspaces ───────────────────────────

create or replace function public.create_workspace_with_owner(
  p_name  text,
  p_slug  text,
  p_type  public.workspace_type,
  p_emoji text default null
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_user_id      uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  if exists (select 1 from public.workspaces where slug = p_slug) then
    raise exception 'Ya existe un workspace con ese slug: %', p_slug;
  end if;

  insert into public.workspaces (name, slug, type, emoji)
  values (p_name, p_slug, p_type, p_emoji)
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'OWNER');

  return v_workspace_id;
end;
$$;

revoke all on function public.create_workspace_with_owner(text,text,public.workspace_type,text) from public;
grant execute on function public.create_workspace_with_owner(text,text,public.workspace_type,text) to authenticated;

-- ─── 4. Audit helper ─────────────────────────────────────────

create or replace function public.log_audit(
  p_workspace_id uuid,
  p_action       text,
  p_entity_type  text,
  p_entity_id    uuid,
  p_metadata     jsonb default null
)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs(user_id, workspace_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_workspace_id, p_action, p_entity_type, p_entity_id, p_metadata);
exception when others then null;
end;
$$;

-- ─── 5. Funciones atómicas de pago (reemplazadas con search_path correcto) ─

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
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
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
  if v_user_id is null then raise exception 'No autenticado'; end if;
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;
  if p_amount <= 0 then raise exception 'El monto debe ser mayor a cero'; end if;

  select * into strict v_receivable
  from public.receivables
  where id = p_receivable_id and workspace_id = p_workspace_id
  for update;

  if v_receivable.status in ('PAID', 'CANCELLED') then
    raise exception 'La cuenta por cobrar ya está cerrada (estado: %)', v_receivable.status;
  end if;

  v_new_paid := v_receivable.amount_paid + p_amount;
  if v_new_paid >= v_receivable.amount then
    v_new_paid   := v_receivable.amount;
    v_new_status := 'PAID';
  elsif v_new_paid > 0 then
    v_new_status := 'PARTIAL';
  else
    v_new_status := v_receivable.status;
  end if;

  -- Categoría de ingresos del sistema (workspace_id IS NULL)
  select id into v_category_id
  from public.categories
  where name = 'Clientes' and is_system = true and workspace_id is null
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

create or replace function public.cancel_client_payment(
  p_workspace_id uuid,
  p_payment_id   uuid
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
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

  if v_payment.transaction_id is not null then
    update public.transactions set status = 'CANCELLED', updated_at = now()
    where id = v_payment.transaction_id;
  end if;

  update public.client_payments set cancelled = true where id = p_payment_id;

  select coalesce(sum(amount), 0) into v_new_paid
  from public.client_payments
  where receivable_id = v_payment.receivable_id and cancelled = false;

  select * into v_receivable from public.receivables where id = v_payment.receivable_id;

  v_new_status := case
    when v_new_paid >= v_receivable.amount then 'PAID'
    when v_new_paid > 0 then 'PARTIAL'
    else 'PENDING'
  end;

  update public.receivables
  set amount_paid = v_new_paid, status = v_new_status, updated_at = now()
  where id = v_payment.receivable_id;

  perform public.log_audit(p_workspace_id, 'CANCEL', 'client_payment', p_payment_id, null);

  return jsonb_build_object('cancelled', true, 'receivable_status', v_new_status);
end;
$$;

create or replace function public.register_payroll_payment(
  p_workspace_id  uuid,
  p_employee_id   uuid,
  p_obligation_id uuid,
  p_account_id    uuid,
  p_amount        numeric,
  p_currency      text default 'USD',
  p_payment_date  date default current_date,
  p_reference     text default null,
  p_notes         text default null
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
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

  -- Categoría de nómina del sistema
  select id into v_category_id
  from public.categories
  where (name ilike '%equipo%' or name ilike '%nómina%')
    and is_system = true and workspace_id is null
  limit 1;

  if v_category_id is null then
    select id into v_category_id
    from public.categories
    where type = 'EXPENSE' and workspace_id is null
    limit 1;
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
    jsonb_build_object('amount', p_amount, 'employee_id', p_employee_id));

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'transaction_id', v_transaction_id,
    'obligation_status', v_new_status
  );
end;
$$;

create or replace function public.cancel_payroll_payment(
  p_workspace_id uuid,
  p_payment_id   uuid
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
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

  select * into v_obligation
  from public.payroll_obligations
  where id = v_payment.payroll_obligation_id;

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

create or replace function public.pay_recurring_expense(
  p_workspace_id         uuid,
  p_recurring_expense_id uuid,
  p_month                int,
  p_year                 int,
  p_account_id           uuid,
  p_payment_date         date default current_date,
  p_reference            text default null
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id        uuid := auth.uid();
  v_expense        record;
  v_obligation     record;
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

create or replace function public.generate_monthly_receivables(
  p_workspace_id uuid,
  p_month        int,
  p_year         int
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_service    record;
  v_due_date   date;
  v_created    int := 0;
  v_skipped    int := 0;
  v_month_start date;
  v_month_end   date;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end   := (v_month_start + interval '1 month' - interval '1 day')::date;

  for v_service in
    select cs.*, c.name as client_name, s.name as service_name
    from public.client_services cs
    join public.clients c on c.id = cs.client_id
    join public.services s on s.id = cs.service_id
    where cs.workspace_id = p_workspace_id
      and cs.status = 'ACTIVE'
      and cs.billing_frequency = 'MONTHLY'
      and cs.start_date <= v_month_end
      and (cs.end_date is null or cs.end_date >= v_month_start)
  loop
    if exists (
      select 1 from public.receivables
      where client_service_id = v_service.id
        and period_month = p_month and period_year = p_year
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_due_date := make_date(p_year, p_month,
      least(coalesce(v_service.billing_day, 1), extract(day from v_month_end)::int));

    insert into public.receivables(
      workspace_id, client_id, client_service_id,
      description, amount, currency, due_date,
      period_month, period_year, status
    ) values (
      p_workspace_id, v_service.client_id, v_service.id,
      v_service.service_name || ' — ' || to_char(v_month_start, 'Mon YYYY'),
      v_service.price, v_service.currency, v_due_date,
      p_month, p_year, 'PENDING'
    );

    v_created := v_created + 1;
  end loop;

  return jsonb_build_object('created', v_created, 'skipped', v_skipped, 'month', p_month, 'year', p_year);
end;
$$;

create or replace function public.generate_payroll_obligations(
  p_workspace_id uuid,
  p_month        int,
  p_year         int
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_rule        record;
  v_due_date    date;
  v_created     int := 0;
  v_skipped     int := 0;
  v_month_start date;
  v_month_end   date;
  v_emp_name    text;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end   := (v_month_start + interval '1 month' - interval '1 day')::date;

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

    if not exists (
      select 1 from public.payroll_obligations
      where payroll_rule_id = v_rule.id
        and period_month = p_month and period_year = p_year
    ) then
      v_due_date := make_date(p_year, p_month,
        least(v_rule.payment_day, extract(day from v_month_end)::int));

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

create or replace function public.generate_recurring_obligations(
  p_workspace_id uuid,
  p_month        int,
  p_year         int
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_expense     record;
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
      least(v_expense.payment_day, extract(day from v_month_end)::int));

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

-- ─── 6. Funciones de analytics ────────────────────────────────

create or replace function public.get_pending_items(
  p_workspace_id uuid,
  p_limit        int default 50,
  p_types        text[] default null
)
returns table (
  id             uuid,
  source_type    text,
  title          text,
  description    text,
  amount         numeric,
  amount_paid    numeric,
  pending_amount numeric,
  due_date       date,
  status         text,
  workspace_id   uuid,
  entity_id      uuid,
  direction      text
)
language sql stable security definer
set search_path = ''
as $$
  with combined as (
    select
      r.id,
      'RECEIVABLE'::text                                     as source_type,
      coalesce(c.company_name, c.name)                      as title,
      r.description,
      r.amount,
      r.amount_paid,
      r.amount - r.amount_paid                              as pending_amount,
      r.due_date,
      case when r.status in ('PENDING','PARTIAL') and r.due_date < current_date
           then 'OVERDUE' else r.status end                  as status,
      r.workspace_id,
      r.id                                                   as entity_id,
      'INCOMING'::text                                       as direction
    from public.receivables r
    join public.clients c on c.id = r.client_id
    where r.workspace_id = p_workspace_id
      and r.status in ('PENDING','PARTIAL')
      and (p_types is null or 'RECEIVABLE' = any(p_types))

    union all

    select
      po.id,
      'PAYROLL'::text                                        as source_type,
      e.name                                                 as title,
      po.description,
      po.amount,
      po.amount_paid,
      po.amount - po.amount_paid                            as pending_amount,
      po.due_date,
      case when po.status in ('PENDING','PARTIAL') and po.due_date < current_date
           then 'OVERDUE' else po.status end                 as status,
      po.workspace_id,
      po.id                                                  as entity_id,
      'OUTGOING'::text                                       as direction
    from public.payroll_obligations po
    join public.employees e on e.id = po.employee_id
    where po.workspace_id = p_workspace_id
      and po.status in ('PENDING','PARTIAL')
      and (p_types is null or 'PAYROLL' = any(p_types))

    union all

    select
      reo.id,
      'RECURRING_EXPENSE'::text                              as source_type,
      re.name                                                as title,
      re.name || ' — ' || to_char(make_date(reo.period_year, reo.period_month, 1), 'Mon YYYY') as description,
      reo.amount,
      0::numeric                                             as amount_paid,
      reo.amount                                            as pending_amount,
      reo.due_date,
      case when reo.due_date < current_date then 'OVERDUE' else reo.status end as status,
      reo.workspace_id,
      reo.id                                                 as entity_id,
      'OUTGOING'::text                                       as direction
    from public.recurring_expense_obligations reo
    join public.recurring_expenses re on re.id = reo.recurring_expense_id
    where reo.workspace_id = p_workspace_id
      and reo.status = 'PENDING'
      and (p_types is null or 'RECURRING_EXPENSE' = any(p_types))
  )
  select *
  from combined
  order by
    case when status = 'OVERDUE' then 0
         when due_date = current_date then 1
         else 2 end,
    due_date,
    pending_amount desc
  limit p_limit;
$$;

create or replace function public.get_business_dashboard(
  p_workspace_id uuid,
  p_from         date,
  p_to           date
)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_billed       numeric;
  v_collected    numeric;
  v_pending      numeric;
  v_expenses     numeric;
  v_billed_count int;
  v_coll_count   int;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;

  select coalesce(sum(amount), 0), count(*)::int
  into v_billed, v_billed_count
  from public.receivables
  where workspace_id = p_workspace_id
    and due_date between p_from and p_to
    and status != 'CANCELLED';

  select coalesce(sum(amount), 0), count(*)::int
  into v_collected, v_coll_count
  from public.client_payments
  where workspace_id = p_workspace_id
    and payment_date between p_from and p_to
    and cancelled = false;

  select coalesce(sum(amount - amount_paid), 0)
  into v_pending
  from public.receivables
  where workspace_id = p_workspace_id
    and due_date between p_from and p_to
    and status in ('PENDING','PARTIAL');

  select coalesce(sum(amount), 0)
  into v_expenses
  from public.transactions
  where workspace_id = p_workspace_id
    and type = 'EXPENSE'
    and status = 'COMPLETED'
    and transaction_date between p_from and p_to;

  return jsonb_build_object(
    'billed',          v_billed,
    'collected',       v_collected,
    'pending',         v_pending,
    'expenses',        v_expenses,
    'operatingProfit', v_collected - v_expenses,
    'billedCount',     v_billed_count,
    'collectedCount',  v_coll_count
  );
end;
$$;

create or replace function public.get_client_profitability(
  p_workspace_id uuid,
  p_client_id    uuid,
  p_from         date default null,
  p_to           date default null
)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_collected   numeric;
  v_direct_cost numeric;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;

  select coalesce(sum(cp.amount), 0)
  into v_collected
  from public.client_payments cp
  where cp.workspace_id = p_workspace_id
    and cp.client_id = p_client_id
    and cp.cancelled = false
    and (p_from is null or cp.payment_date >= p_from)
    and (p_to   is null or cp.payment_date <= p_to);

  select coalesce(sum(t.amount), 0)
  into v_direct_cost
  from public.transactions t
  where t.workspace_id = p_workspace_id
    and t.client_id = p_client_id
    and t.type = 'EXPENSE'
    and t.status = 'COMPLETED'
    and (p_from is null or t.transaction_date >= p_from)
    and (p_to   is null or t.transaction_date <= p_to);

  return jsonb_build_object(
    'collected',   v_collected,
    'directCosts', v_direct_cost,
    'margin',      v_collected - v_direct_cost,
    'marginPct',   case when v_collected > 0
                        then round(((v_collected - v_direct_cost) / v_collected) * 100, 1)
                        else 0 end
  );
end;
$$;

-- ─── Grants finales ───────────────────────────────────────────
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
    'generate_recurring_obligations(uuid,int,int)',
    'get_pending_items(uuid,int,text[])',
    'get_business_dashboard(uuid,date,date)',
    'get_client_profitability(uuid,uuid,date,date)',
    'log_audit(uuid,text,text,uuid,jsonb)'
  ];
  fn text;
begin
  foreach fn in array fns loop
    execute format('revoke all on function public.%s from public', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;

-- ─── Función get_workspace_balance (faltaba search_path) ─────

create or replace function public.get_workspace_balance(
  p_workspace_id uuid,
  p_from         date,
  p_to           date
)
returns table (
  total_income   numeric,
  total_expenses numeric,
  balance        numeric
)
language sql stable security definer
set search_path = ''
as $$
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

revoke all on function public.get_workspace_balance(uuid,date,date) from public, anon;
grant execute on function public.get_workspace_balance(uuid,date,date) to authenticated;

-- ─── Revocar anon de funciones sensibles ─────────────────────
revoke all on function public.is_workspace_member(uuid) from public, anon;
revoke all on function public.is_workspace_admin(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_admin(uuid) to authenticated;
