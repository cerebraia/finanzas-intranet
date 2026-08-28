-- ============================================================
-- MIGRACIÓN 024: Analytics multi-moneda
-- Agrega parámetro p_currency opcional a get_financial_summary,
-- get_cashflow_series y get_expense_breakdown para filtrar por
-- moneda. También añade get_workspace_currencies como utilidad.
-- ============================================================

-- ─── 1. GET FINANCIAL SUMMARY (con filtro de moneda) ─────────
create or replace function public.get_financial_summary(
  p_workspace_id uuid,
  p_from         date,
  p_to           date,
  p_currency     public.currency_type default null  -- null = todas las monedas (comportamiento legacy)
)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_income          numeric;  v_income_count   int;
  v_expenses        numeric;  v_expenses_count int;
  v_pending         numeric;  v_pending_count  int;
  v_avail_cash      numeric;
  v_total_debt      numeric;
  v_committed       numeric;
  v_planned_purch   numeric;
  v_savings_rate    numeric;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;

  -- Ingresos / Gastos del período (con filtro de moneda opcional)
  select
    coalesce(sum(case when type='INCOME'  and status='COMPLETED' then amount else 0 end), 0),
    coalesce(count(case when type='INCOME'  and status='COMPLETED' then 1 end)::int, 0),
    coalesce(sum(case when type='EXPENSE' and status='COMPLETED' then amount else 0 end), 0),
    coalesce(count(case when type='EXPENSE' and status='COMPLETED' then 1 end)::int, 0),
    coalesce(sum(case when status='PENDING' then amount else 0 end), 0),
    coalesce(count(case when status='PENDING' then 1 end)::int, 0)
  into v_income, v_income_count, v_expenses, v_expenses_count, v_pending, v_pending_count
  from public.transactions
  where workspace_id = p_workspace_id
    and transaction_date between p_from and p_to
    and type in ('INCOME','EXPENSE')
    and (p_currency is null or currency = p_currency);

  -- Saldo real de cuentas (saldo inicial + todos los movimientos completados históricos)
  -- Transfers cancel out in the total, so they are not included here.
  v_avail_cash := coalesce((
    select sum(a.initial_balance)
      from public.accounts a
     where a.workspace_id = p_workspace_id
       and a.is_active = true
       and (p_currency is null or a.currency = p_currency)
  ), 0)
  + coalesce((
    select sum(case when t.type='INCOME' then t.amount else -t.amount end)
      from public.transactions t
     where t.workspace_id = p_workspace_id
       and t.status = 'COMPLETED'
       and t.type in ('INCOME','EXPENSE')
       and (p_currency is null or t.currency = p_currency)
  ), 0);

  -- Deuda total pendiente (cuotas activas de deudas por pagar)
  select coalesce(sum(di.amount - di.amount_paid), 0)
  into v_total_debt
  from public.debt_installments di
  join public.debts d on d.id = di.debt_id
  where di.workspace_id = p_workspace_id
    and di.status in ('PENDING','PARTIAL')
    and d.status = 'ACTIVE'
    and (d.type != 'SAN' or coalesce(d.san_direction,'PAYABLE') = 'PAYABLE');

  -- Comprometido del período (obligaciones pendientes dentro del rango de fechas)
  with obls as (
    select amount - amount_paid as pending from public.payroll_obligations
    where workspace_id = p_workspace_id and status in ('PENDING','PARTIAL')
      and due_date between p_from and p_to
    union all
    select amount from public.recurring_expense_obligations
    where workspace_id = p_workspace_id and status = 'PENDING'
      and due_date between p_from and p_to
    union all
    select di.amount - di.amount_paid
    from public.debt_installments di
    join public.debts d on d.id = di.debt_id
    where di.workspace_id = p_workspace_id and di.status in ('PENDING','PARTIAL')
      and di.due_date between p_from and p_to
      and d.status = 'ACTIVE'
      and (d.type != 'SAN' or coalesce(d.san_direction,'PAYABLE') = 'PAYABLE')
  )
  select coalesce(sum(pending), 0) into v_committed from obls;

  -- Compras planificadas
  select coalesce(sum(estimated_amount), 0)
  into v_planned_purch
  from public.purchase_items
  where workspace_id = p_workspace_id
    and status in ('TODO','PLANNED')
    and estimated_amount is not null;

  -- Tasa de ahorro (null si ingresos = 0)
  if v_income > 0 then
    v_savings_rate := round(((v_income - v_expenses) / v_income) * 100, 1);
  else
    v_savings_rate := null;
  end if;

  return jsonb_build_object(
    'income',           v_income,
    'incomeCount',      v_income_count,
    'expenses',         v_expenses,
    'expensesCount',    v_expenses_count,
    'balance',          v_income - v_expenses,
    'savingsRate',      v_savings_rate,
    'pending',          v_pending,
    'pendingCount',     v_pending_count,
    'availableCash',    v_avail_cash,
    'totalDebt',        v_total_debt,
    'committed',        v_committed,
    'plannedPurchases', v_planned_purch,
    'freeCash',         v_avail_cash - v_committed,
    'projectedFree',    v_avail_cash - v_committed - v_planned_purch
  );
end;
$$;

-- ─── 2. GET CASHFLOW SERIES (con filtro de moneda) ───────────
create or replace function public.get_cashflow_series(
  p_workspace_id uuid,
  p_year         int,
  p_currency     public.currency_type default null  -- null = todas las monedas (comportamiento legacy)
)
returns table (
  month_num  int,
  month_name text,
  income     numeric,
  expenses   numeric,
  balance    numeric
)
language sql stable security definer
set search_path = ''
as $$
  with months as (
    select generate_series(1, 12) as m
  ),
  txs as (
    select
      extract(month from transaction_date)::int as m,
      sum(case when type = 'INCOME'  and status = 'COMPLETED' then amount else 0 end) as inc,
      sum(case when type = 'EXPENSE' and status = 'COMPLETED' then amount else 0 end) as exp
    from public.transactions
    where workspace_id = p_workspace_id
      and extract(year from transaction_date) = p_year
      and type in ('INCOME','EXPENSE')
      and (p_currency is null or currency = p_currency)
    group by 1
  )
  select
    mo.m,
    to_char(make_date(p_year, mo.m, 1), 'Mon') as month_name,
    coalesce(t.inc, 0)                          as income,
    coalesce(t.exp, 0)                          as expenses,
    coalesce(t.inc, 0) - coalesce(t.exp, 0)    as balance
  from months mo
  left join txs t on t.m = mo.m
  order by mo.m;
$$;

-- ─── 3. GET EXPENSE BREAKDOWN (con filtro de moneda) ─────────
create or replace function public.get_expense_breakdown(
  p_workspace_id uuid,
  p_from         date,
  p_to           date,
  p_currency     public.currency_type default null  -- null = todas las monedas (comportamiento legacy)
)
returns table (
  category_id   uuid,
  category_name text,
  amount        numeric,
  percentage    numeric
)
language sql stable security definer
set search_path = ''
as $$
  with totals as (
    select
      category_id,
      sum(amount) as cat_amount
    from public.transactions
    where workspace_id = p_workspace_id
      and type = 'EXPENSE'
      and status = 'COMPLETED'
      and transaction_date between p_from and p_to
      and (p_currency is null or currency = p_currency)
    group by category_id
  ),
  grand as (
    select sum(cat_amount) as total from totals
  )
  select
    t.category_id,
    coalesce(c.name, 'Sin categoría') as category_name,
    t.cat_amount                       as amount,
    case when g.total > 0
         then round((t.cat_amount / g.total) * 100, 1)
         else 0 end                    as percentage
  from totals t
  cross join grand g
  left join public.categories c on c.id = t.category_id
  order by t.cat_amount desc;
$$;

-- ─── 4. GET WORKSPACE CURRENCIES ─────────────────────────────
create or replace function public.get_workspace_currencies(
  p_workspace_id uuid
) returns table (currency text)
language sql stable security definer set search_path = ''
as $$
  select distinct a.currency::text
    from public.accounts a
   where a.workspace_id = p_workspace_id
     and a.is_active = true
   order by 1;
$$;

-- ─── Grants ──────────────────────────────────────────────────
do $$
declare
  fns text[] := array[
    'get_financial_summary(uuid,date,date,public.currency_type)',
    'get_cashflow_series(uuid,int,public.currency_type)',
    'get_expense_breakdown(uuid,date,date,public.currency_type)',
    'get_workspace_currencies(uuid)'
  ];
  fn text;
begin
  foreach fn in array fns loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;
