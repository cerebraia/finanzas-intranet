-- ============================================================
-- MIGRACIÓN 017: Extender get_pending_items con DEBT
-- y función get_calendar_events para datos reales
-- ============================================================

-- ─── 1. get_pending_items extendido con deudas ────────────────
create or replace function public.get_pending_items(
  p_workspace_id uuid,
  p_limit        int    default 50,
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
    -- Receivables (INCOMING)
    select
      r.id,
      'RECEIVABLE'::text                                    as source_type,
      coalesce(c.company_name, c.name)                     as title,
      r.description,
      r.amount,
      r.amount_paid,
      r.amount - r.amount_paid                             as pending_amount,
      r.due_date,
      case when r.status in ('PENDING','PARTIAL') and r.due_date < current_date
           then 'OVERDUE' else r.status end                 as status,
      r.workspace_id,
      r.id                                                  as entity_id,
      'INCOMING'::text                                      as direction
    from public.receivables r
    join public.clients c on c.id = r.client_id
    where r.workspace_id = p_workspace_id
      and r.status in ('PENDING','PARTIAL')
      and (p_types is null or 'RECEIVABLE' = any(p_types))

    union all

    -- Payroll Obligations (OUTGOING)
    select
      po.id,
      'PAYROLL'::text                                       as source_type,
      e.name                                                as title,
      po.description,
      po.amount,
      po.amount_paid,
      po.amount - po.amount_paid                           as pending_amount,
      po.due_date,
      case when po.status in ('PENDING','PARTIAL') and po.due_date < current_date
           then 'OVERDUE' else po.status end                as status,
      po.workspace_id,
      po.id                                                 as entity_id,
      'OUTGOING'::text                                      as direction
    from public.payroll_obligations po
    join public.employees e on e.id = po.employee_id
    where po.workspace_id = p_workspace_id
      and po.status in ('PENDING','PARTIAL')
      and (p_types is null or 'PAYROLL' = any(p_types))

    union all

    -- Recurring Expense Obligations (OUTGOING)
    select
      reo.id,
      'RECURRING_EXPENSE'::text                             as source_type,
      re.name                                               as title,
      re.name || ' — ' || to_char(make_date(reo.period_year, reo.period_month, 1), 'Mon YYYY') as description,
      reo.amount,
      0::numeric                                            as amount_paid,
      reo.amount                                           as pending_amount,
      reo.due_date,
      case when reo.due_date < current_date then 'OVERDUE' else reo.status end as status,
      reo.workspace_id,
      reo.id                                                as entity_id,
      'OUTGOING'::text                                      as direction
    from public.recurring_expense_obligations reo
    join public.recurring_expenses re on re.id = reo.recurring_expense_id
    where reo.workspace_id = p_workspace_id
      and reo.status = 'PENDING'
      and (p_types is null or 'RECURRING_EXPENSE' = any(p_types))

    union all

    -- Debt Installments (OUTGOING para deudas normales + SAN PAYABLE)
    select
      di.id,
      'DEBT'::text                                          as source_type,
      d.name                                                as title,
      d.type || ' — Cuota ' || di.installment_number::text  as description,
      di.amount,
      di.amount_paid,
      di.amount - di.amount_paid                           as pending_amount,
      di.due_date,
      case when di.status in ('PENDING','PARTIAL') and di.due_date < current_date
           then 'OVERDUE' else di.status end                as status,
      di.workspace_id,
      di.id                                                 as entity_id,
      case when d.type = 'SAN' and d.san_direction = 'RECEIVABLE'
           then 'INCOMING' else 'OUTGOING' end              as direction
    from public.debt_installments di
    join public.debts d on d.id = di.debt_id
    where di.workspace_id = p_workspace_id
      and di.status in ('PENDING','PARTIAL')
      and d.status = 'ACTIVE'
      and (p_types is null or 'DEBT' = any(p_types))
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

revoke all on function public.get_pending_items(uuid,int,text[]) from public, anon;
grant execute on function public.get_pending_items(uuid,int,text[]) to authenticated;

-- ─── 2. get_calendar_events: eventos reales del mes ──────────
create or replace function public.get_calendar_events(
  p_workspace_id uuid,
  p_month        int,
  p_year         int,
  p_user_id      uuid default null
)
returns table (
  id          uuid,
  title       text,
  amount      numeric,
  event_type  text,
  day         int,
  month       int,
  year        int,
  status      text,
  description text
)
language sql stable security definer
set search_path = ''
as $$
  with
  v_start as (select make_date(p_year, p_month, 1) as d),
  v_end   as (select (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date as d)
  (
    -- Receivables del mes
    select
      r.id,
      coalesce(c.company_name, c.name) as title,
      r.amount,
      'client'::text                    as event_type,
      extract(day from r.due_date)::int as day,
      p_month, p_year,
      case when r.status = 'PAID' then 'paid'
           when r.due_date < current_date and r.status not in ('PAID','CANCELLED') then 'overdue'
           else 'pending' end           as status,
      r.description
    from public.receivables r
    join public.clients c on c.id = r.client_id
    where r.workspace_id = p_workspace_id
      and r.due_date between (select d from v_start) and (select d from v_end)
      and r.status != 'CANCELLED'
  )
  union all
  (
    -- Payroll del mes
    select
      po.id,
      e.name,
      po.amount - po.amount_paid,
      'payroll'::text,
      extract(day from po.due_date)::int,
      p_month, p_year,
      case when po.status = 'PAID' then 'paid'
           when po.due_date < current_date and po.status not in ('PAID','CANCELLED') then 'overdue'
           else 'pending' end,
      po.description
    from public.payroll_obligations po
    join public.employees e on e.id = po.employee_id
    where po.workspace_id = p_workspace_id
      and po.due_date between (select d from v_start) and (select d from v_end)
      and po.status != 'CANCELLED'
  )
  union all
  (
    -- Gastos recurrentes del mes
    select
      reo.id,
      re.name,
      reo.amount,
      'fixed'::text,
      extract(day from reo.due_date)::int,
      p_month, p_year,
      case when reo.status = 'PAID' then 'paid'
           when reo.due_date < current_date and reo.status = 'PENDING' then 'overdue'
           else 'pending' end,
      re.name
    from public.recurring_expense_obligations reo
    join public.recurring_expenses re on re.id = reo.recurring_expense_id
    where reo.workspace_id = p_workspace_id
      and reo.due_date between (select d from v_start) and (select d from v_end)
  )
  union all
  (
    -- Cuotas de deuda del mes
    select
      di.id,
      d.name || ' C.' || di.installment_number::text,
      di.amount - di.amount_paid,
      'debt'::text,
      extract(day from di.due_date)::int,
      p_month, p_year,
      case when di.status = 'PAID' then 'paid'
           when di.due_date < current_date and di.status not in ('PAID','CANCELLED') then 'overdue'
           else 'pending' end,
      d.type || ' — Cuota ' || di.installment_number::text
    from public.debt_installments di
    join public.debts d on d.id = di.debt_id
    where di.workspace_id = p_workspace_id
      and di.due_date between (select d from v_start) and (select d from v_end)
      and di.status != 'CANCELLED'
      and d.status = 'ACTIVE'
  )
  union all
  (
    -- Compras planificadas del mes (no afectan balance)
    select
      pi.id,
      pi.title,
      coalesce(pi.estimated_amount, 0),
      'purchase'::text,
      extract(day from pi.due_date)::int,
      p_month, p_year,
      'pending'::text,
      coalesce(pi.description, pi.title)
    from public.purchase_items pi
    where (
      (pi.workspace_id = p_workspace_id)
      or (pi.workspace_id is null and pi.created_by = coalesce(p_user_id, auth.uid()))
    )
      and pi.due_date between (select d from v_start) and (select d from v_end)
      and pi.status not in ('PURCHASED','CANCELLED')
  )
  union all
  (
    -- Recordatorios del mes
    select
      rm.id,
      rm.title,
      0::numeric,
      'reminder'::text,
      extract(day from coalesce(rm.snoozed_until, rm.reminder_at))::int,
      p_month, p_year,
      case when rm.status = 'COMPLETED' then 'paid'
           when coalesce(rm.snoozed_until, rm.reminder_at) < current_date and rm.status = 'PENDING' then 'overdue'
           else 'pending' end,
      coalesce(rm.description, rm.title)
    from public.reminders rm
    where (
      (rm.workspace_id = p_workspace_id)
      or (rm.workspace_id is null and rm.created_by = coalesce(p_user_id, auth.uid()))
    )
      and coalesce(rm.snoozed_until, rm.reminder_at) between (select d from v_start) and (select d from v_end)
      and rm.status not in ('DISMISSED')
  )
  order by day, amount desc;
$$;

revoke all on function public.get_calendar_events(uuid,int,int,uuid) from public, anon;
grant execute on function public.get_calendar_events(uuid,int,int,uuid) to authenticated;
