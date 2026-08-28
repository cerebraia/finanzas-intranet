-- ============================================================
-- MIGRACIÓN 020: RPCs de analytics centralizadas
-- FUENTE ÚNICA DE VERDAD para todas las métricas financieras
-- search_path = '' en todas las funciones SECURITY DEFINER
-- ============================================================

-- ─── 1. FINANCIAL SUMMARY (fuente canónica del dashboard) ────
-- Reemplaza los cálculos dispersos en dashboardService.summary
create or replace function public.get_financial_summary(
  p_workspace_id uuid,
  p_from         date,
  p_to           date
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

  -- Ingresos / Gastos del período
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
    and type in ('INCOME','EXPENSE');

  -- Saldo real de cuentas (saldo inicial + todos los movimientos completados históricos)
  select
    coalesce((select sum(initial_balance) from public.accounts
              where workspace_id = p_workspace_id and is_active = true), 0)
    + coalesce((select sum(case when type='INCOME' then amount else -amount end)
                from public.transactions
                where workspace_id = p_workspace_id
                  and status = 'COMPLETED'
                  and type in ('INCOME','EXPENSE')), 0)
  into v_avail_cash;

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

-- ─── 2. CASHFLOW SERIES (para gráficos mensuales) ────────────
create or replace function public.get_cashflow_series(
  p_workspace_id uuid,
  p_year         int
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

-- ─── 3. EXPENSE BREAKDOWN (distribución por categoría) ───────
create or replace function public.get_expense_breakdown(
  p_workspace_id uuid,
  p_from         date,
  p_to           date
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

-- ─── 4. PERIOD COMPARISON (comparativa período actual vs anterior) ─
create or replace function public.get_period_comparison(
  p_workspace_id uuid,
  p_from         date,
  p_to           date
)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_days         int;
  v_prev_from    date;
  v_prev_to      date;
  v_curr_inc     numeric; v_curr_exp numeric;
  v_prev_inc     numeric; v_prev_exp numeric;
  v_inc_diff     numeric; v_exp_diff numeric;
  v_inc_pct      numeric; v_exp_pct  numeric;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso';
  end if;

  -- Calcular período anterior (mismo número de días)
  v_days      := p_to - p_from + 1;
  v_prev_to   := p_from - 1;
  v_prev_from := v_prev_to - v_days + 1;

  -- Período actual
  select
    coalesce(sum(case when type='INCOME'  and status='COMPLETED' then amount else 0 end),0),
    coalesce(sum(case when type='EXPENSE' and status='COMPLETED' then amount else 0 end),0)
  into v_curr_inc, v_curr_exp
  from public.transactions
  where workspace_id = p_workspace_id
    and transaction_date between p_from and p_to;

  -- Período anterior
  select
    coalesce(sum(case when type='INCOME'  and status='COMPLETED' then amount else 0 end),0),
    coalesce(sum(case when type='EXPENSE' and status='COMPLETED' then amount else 0 end),0)
  into v_prev_inc, v_prev_exp
  from public.transactions
  where workspace_id = p_workspace_id
    and transaction_date between v_prev_from and v_prev_to;

  v_inc_diff := v_curr_inc - v_prev_inc;
  v_exp_diff := v_curr_exp - v_prev_exp;

  -- % de cambio (null si base = 0 para evitar división por cero)
  v_inc_pct := case when v_prev_inc > 0 then round((v_inc_diff / v_prev_inc) * 100, 1) else null end;
  v_exp_pct := case when v_prev_exp > 0 then round((v_exp_diff / v_prev_exp) * 100, 1) else null end;

  return jsonb_build_object(
    'current', jsonb_build_object(
      'income',   v_curr_inc,
      'expenses', v_curr_exp,
      'balance',  v_curr_inc - v_curr_exp
    ),
    'previous', jsonb_build_object(
      'income',   v_prev_inc,
      'expenses', v_prev_exp,
      'balance',  v_prev_inc - v_prev_exp,
      'from',     v_prev_from,
      'to',       v_prev_to
    ),
    'changes', jsonb_build_object(
      'incomeAbs', v_inc_diff,
      'incomePct', v_inc_pct,
      'expensesAbs', v_exp_diff,
      'expensesPct', v_exp_pct
    )
  );
end;
$$;

-- ─── 5. BUDGET STATUS (presupuestos con gasto real) ──────────
create or replace function public.get_budget_status(
  p_workspace_id uuid,
  p_from         date default null,
  p_to           date default null
)
returns table (
  budget_id        uuid,
  budget_name      text,
  category_name    text,
  budget_amount    numeric,
  spent            numeric,
  remaining        numeric,
  spent_pct        numeric,
  status           text,
  alert_threshold  numeric,
  period_from      date,
  period_to        date
)
language sql stable security definer
set search_path = ''
as $$
  select
    b.id                                         as budget_id,
    b.name                                       as budget_name,
    c.name                                       as category_name,
    b.amount                                     as budget_amount,
    coalesce(spent.total, 0)                     as spent,
    greatest(b.amount - coalesce(spent.total,0), 0) as remaining,
    case when b.amount > 0
         then round((coalesce(spent.total,0) / b.amount) * 100, 1)
         else 0 end                              as spent_pct,
    case
      when coalesce(spent.total,0) >= b.amount then 'EXCEEDED'
      when b.amount > 0 and (coalesce(spent.total,0)/b.amount)*100 >= 90 then 'CRITICAL'
      when b.amount > 0 and (coalesce(spent.total,0)/b.amount)*100 >= b.alert_threshold then 'WARNING'
      else 'SAFE'
    end                                          as status,
    b.alert_threshold,
    b.start_date                                 as period_from,
    b.end_date                                   as period_to
  from public.budgets b
  left join public.categories c on c.id = b.category_id
  left join lateral (
    select sum(t.amount) as total
    from public.transactions t
    where t.workspace_id = b.workspace_id
      and t.type = 'EXPENSE'
      and t.status = 'COMPLETED'
      and t.transaction_date between
            coalesce(p_from, b.start_date) and coalesce(p_to, b.end_date)
      and (b.category_id is null or t.category_id = b.category_id)
  ) spent on true
  where b.workspace_id = p_workspace_id
    and b.is_active = true
  order by spent_pct desc;
$$;

-- ─── 6. GOAL PROGRESS ────────────────────────────────────────
create or replace function public.get_goal_progress(
  p_workspace_id uuid
)
returns table (
  goal_id       uuid,
  goal_name     text,
  target_amount numeric,
  saved         numeric,
  remaining     numeric,
  progress_pct  numeric,
  status        text,
  priority      text,
  target_date   date,
  days_remaining int
)
language sql stable security definer
set search_path = ''
as $$
  select
    g.id                                                           as goal_id,
    g.name                                                         as goal_name,
    g.target_amount,
    coalesce(c.total_saved, 0)                                    as saved,
    greatest(g.target_amount - coalesce(c.total_saved,0), 0)     as remaining,
    case when g.target_amount > 0
         then round((coalesce(c.total_saved,0) / g.target_amount) * 100, 1)
         else 0 end                                               as progress_pct,
    g.status,
    g.priority,
    g.target_date,
    case when g.target_date is not null
         then (g.target_date - current_date)::int
         else null end                                             as days_remaining
  from public.financial_goals g
  left join lateral (
    select sum(amount) as total_saved
    from public.goal_contributions
    where goal_id = g.id
  ) c on true
  where g.workspace_id = p_workspace_id
    and g.status in ('ACTIVE','PAUSED')
  order by
    case g.priority when 'HIGH' then 0 when 'MEDIUM' then 1 else 2 end,
    g.target_date nulls last;
$$;

-- ─── 7. MOVING AVERAGE PROJECTIONS ───────────────────────────
create or replace function public.get_projections(
  p_workspace_id uuid,
  p_months       int default 6  -- número de meses a proyectar
)
returns table (
  period_label  text,
  income        numeric,
  expenses      numeric,
  balance       numeric,
  is_projected  boolean
)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_avg_income   numeric;
  v_avg_expenses numeric;
  i              int;
  v_target_date  date;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso';
  end if;

  -- Promedio móvil de los últimos 3 meses completos
  select
    coalesce(avg(monthly_income), 0),
    coalesce(avg(monthly_expenses), 0)
  into v_avg_income, v_avg_expenses
  from (
    select
      sum(case when type='INCOME'  and status='COMPLETED' then amount else 0 end) as monthly_income,
      sum(case when type='EXPENSE' and status='COMPLETED' then amount else 0 end) as monthly_expenses
    from public.transactions
    where workspace_id = p_workspace_id
      and transaction_date >= date_trunc('month', current_date - interval '3 months')
      and transaction_date <  date_trunc('month', current_date)
      and type in ('INCOME','EXPENSE')
    group by date_trunc('month', transaction_date)
  ) monthly_agg;

  -- Proyectar meses futuros
  for i in 1..p_months loop
    v_target_date := date_trunc('month', current_date + (i || ' months')::interval)::date;
    return query select
      to_char(v_target_date, 'Mon YYYY'),
      round(v_avg_income, 2),
      round(v_avg_expenses, 2),
      round(v_avg_income - v_avg_expenses, 2),
      true;
  end loop;
end;
$$;

-- ─── 8. MONTH CLOSE PREVIEW ──────────────────────────────────
create or replace function public.get_month_close_preview(
  p_workspace_id uuid,
  p_year         int,
  p_month        int
)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_from date;
  v_to   date;
  v_data jsonb;
  v_ads  jsonb;
  v_warnings jsonb;
  v_pending_tx    int;
  v_overdue_recv  int;
  v_overdue_payrl int;
  v_overdue_debt  int;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso';
  end if;
  if p_month < 1 or p_month > 12 then
    raise exception 'Mes inválido';
  end if;

  v_from := make_date(p_year, p_month, 1);
  v_to   := (v_from + interval '1 month' - interval '1 day')::date;

  -- Resumen financiero principal
  select public.get_financial_summary(p_workspace_id, v_from, v_to) into v_data;

  -- Fernando ADS específico (facturado / cobrado)
  select public.get_business_dashboard(p_workspace_id, v_from, v_to) into v_ads;

  -- Advertencias
  select count(*)::int into v_pending_tx
  from public.transactions
  where workspace_id = p_workspace_id and status = 'PENDING'
    and transaction_date between v_from and v_to;

  select count(*)::int into v_overdue_recv
  from public.receivables
  where workspace_id = p_workspace_id
    and status in ('PENDING','PARTIAL') and due_date < current_date;

  select count(*)::int into v_overdue_payrl
  from public.payroll_obligations
  where workspace_id = p_workspace_id
    and status in ('PENDING','PARTIAL') and due_date < current_date;

  select count(*)::int into v_overdue_debt
  from public.debt_installments di
  join public.debts d on d.id = di.debt_id
  where di.workspace_id = p_workspace_id
    and di.status in ('PENDING','PARTIAL') and di.due_date < current_date
    and d.status = 'ACTIVE';

  v_warnings := jsonb_build_object(
    'pendingTransactions', v_pending_tx,
    'overdueReceivables',  v_overdue_recv,
    'overduePayroll',      v_overdue_payrl,
    'overdueDebt',         v_overdue_debt,
    'hasWarnings',         (v_pending_tx + v_overdue_recv + v_overdue_payrl + v_overdue_debt) > 0
  );

  return jsonb_build_object(
    'year',     p_year,
    'month',    p_month,
    'summary',  v_data,
    'ads',      v_ads,
    'warnings', v_warnings
  );
end;
$$;

-- ─── 9. CLOSE FINANCIAL MONTH (atómico) ──────────────────────
create or replace function public.close_financial_month(
  p_workspace_id uuid,
  p_year         int,
  p_month        int
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_from    date;
  v_to      date;
  v_preview jsonb;
  v_summary jsonb;
  v_closure_id uuid;
begin
  if v_user_id is null then raise exception 'No autenticado'; end if;
  if not public.is_workspace_admin(p_workspace_id) then
    raise exception 'Solo administradores pueden cerrar el mes';
  end if;
  if p_month < 1 or p_month > 12 then
    raise exception 'Mes inválido';
  end if;

  v_from := make_date(p_year, p_month, 1);
  v_to   := (v_from + interval '1 month' - interval '1 day')::date;

  -- Generar preview (incluye todos los datos)
  select public.get_month_close_preview(p_workspace_id, p_year, p_month) into v_preview;
  v_summary := v_preview->'summary';

  -- Insertar o reabrir si ya existe
  insert into public.monthly_closures(
    workspace_id, year, month,
    income, expenses, balance,
    billed, collected,
    receivables_pending, payables_pending,
    available_cash, total_debt, committed_amount, planned_purchases,
    snapshot,
    is_reopened, closed_by, closed_at
  ) values (
    p_workspace_id, p_year, p_month,
    (v_summary->>'income')::numeric,
    (v_summary->>'expenses')::numeric,
    (v_summary->>'balance')::numeric,
    coalesce((v_preview->'ads'->>'billed')::numeric, 0),
    coalesce((v_preview->'ads'->>'collected')::numeric, 0),
    coalesce((v_summary->>'pending')::numeric, 0),
    coalesce((v_summary->>'committed')::numeric, 0),
    coalesce((v_summary->>'availableCash')::numeric, 0),
    coalesce((v_summary->>'totalDebt')::numeric, 0),
    coalesce((v_summary->>'committed')::numeric, 0),
    coalesce((v_summary->>'plannedPurchases')::numeric, 0),
    v_preview,
    false, v_user_id, now()
  )
  on conflict (workspace_id, year, month)
  do update set
    income               = excluded.income,
    expenses             = excluded.expenses,
    balance              = excluded.balance,
    billed               = excluded.billed,
    collected            = excluded.collected,
    receivables_pending  = excluded.receivables_pending,
    payables_pending     = excluded.payables_pending,
    available_cash       = excluded.available_cash,
    total_debt           = excluded.total_debt,
    committed_amount     = excluded.committed_amount,
    planned_purchases    = excluded.planned_purchases,
    snapshot             = excluded.snapshot,
    is_reopened          = true,
    reopened_at          = now(),
    closed_by            = excluded.closed_by,
    closed_at            = excluded.closed_at
  returning id into v_closure_id;

  perform public.log_audit(p_workspace_id, 'MONTH_CLOSED', 'monthly_closure', v_closure_id,
    jsonb_build_object('year', p_year, 'month', p_month));

  return jsonb_build_object(
    'closure_id', v_closure_id,
    'year',       p_year,
    'month',      p_month,
    'closed',     true
  );
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────
do $$
declare
  fns text[] := array[
    'get_financial_summary(uuid,date,date)',
    'get_cashflow_series(uuid,int)',
    'get_expense_breakdown(uuid,date,date)',
    'get_period_comparison(uuid,date,date)',
    'get_budget_status(uuid,date,date)',
    'get_goal_progress(uuid)',
    'get_projections(uuid,int)',
    'get_month_close_preview(uuid,int,int)',
    'close_financial_month(uuid,int,int)'
  ];
  fn text;
begin
  foreach fn in array fns loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;
