-- ============================================================
-- MIGRACIÓN 008: Funciones de analytics y pending items
-- Ejecutar DESPUÉS de la migración 007
-- ============================================================

-- ─── Pending Items unificados ────────────────────────────────
-- Combina receivables, payroll_obligations, recurring_expense_obligations
-- en un formato normalizado con direction INCOMING / OUTGOING
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
language sql stable security definer set search_path = public as $$
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

-- ─── Business Dashboard Summary ──────────────────────────────
create or replace function public.get_business_dashboard(
  p_workspace_id uuid,
  p_from         date,
  p_to           date
)
returns jsonb language plpgsql stable security definer set search_path = public as $$
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

  -- Facturado (receivables del período)
  select coalesce(sum(amount), 0), count(*)::int
  into v_billed, v_billed_count
  from public.receivables
  where workspace_id = p_workspace_id
    and due_date between p_from and p_to
    and status != 'CANCELLED';

  -- Cobrado (client_payments del período)
  select coalesce(sum(amount), 0), count(*)::int
  into v_collected, v_coll_count
  from public.client_payments
  where workspace_id = p_workspace_id
    and payment_date between p_from and p_to
    and cancelled = false;

  -- Pendiente por cobrar (receivables abiertos con due_date en período)
  select coalesce(sum(amount - amount_paid), 0)
  into v_pending
  from public.receivables
  where workspace_id = p_workspace_id
    and due_date between p_from and p_to
    and status in ('PENDING','PARTIAL');

  -- Gastos del período (transactions EXPENSE COMPLETED)
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

-- ─── Client Financial Summary ─────────────────────────────────
create or replace function public.get_client_profitability(
  p_workspace_id uuid,
  p_client_id    uuid,
  p_from         date default null,
  p_to           date default null
)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_collected   numeric;
  v_direct_cost numeric;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;

  -- Pagos cobrados
  select coalesce(sum(cp.amount), 0)
  into v_collected
  from public.client_payments cp
  where cp.workspace_id = p_workspace_id
    and cp.client_id = p_client_id
    and cp.cancelled = false
    and (p_from is null or cp.payment_date >= p_from)
    and (p_to   is null or cp.payment_date <= p_to);

  -- Gastos directamente atribuibles al cliente
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
    'marginPct',   case when v_collected > 0 then round(((v_collected - v_direct_cost) / v_collected) * 100, 1) else 0 end
  );
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────
revoke all on function public.get_pending_items(uuid,int,text[])    from public;
revoke all on function public.get_business_dashboard(uuid,date,date) from public;
revoke all on function public.get_client_profitability(uuid,uuid,date,date) from public;
grant execute on function public.get_pending_items(uuid,int,text[])    to authenticated;
grant execute on function public.get_business_dashboard(uuid,date,date) to authenticated;
grant execute on function public.get_client_profitability(uuid,uuid,date,date) to authenticated;
