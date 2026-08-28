-- ============================================================
-- MIGRACIÓN 027: Catálogo de Servicios
-- Agrega campos de precio base a services (ya existe la tabla).
-- Agrega DELETE policy a recurring_expenses y employees.
-- Mejora generate_monthly_receivables para usar custom_price
-- del client_service en lugar del price del receivable.
-- ============================================================

-- ─── 1. Ampliar tabla services con precio base ────────────────

alter table public.services
  add column if not exists base_price   numeric(18,2)  not null default 0,
  add column if not exists currency     text           not null default 'USD',
  add column if not exists billing_mode text           not null default 'MONTHLY',
  add column if not exists category     text;

-- billing_mode values: ONE_TIME | MONTHLY | QUARTERLY | YEARLY | CUSTOM

-- ─── 2. Actualizar RLS services ──────────────────────────────

-- DROP existing policies if they exist (to avoid conflicts)
drop policy if exists "members can read services"       on public.services;
drop policy if exists "members can insert services"     on public.services;
drop policy if exists "members can update services"     on public.services;
drop policy if exists "members can delete services"     on public.services;
drop policy if exists "admins can manage services"      on public.services;
drop policy if exists "workspace members can view services" on public.services;

alter table public.services enable row level security;

create policy "services_select" on public.services
  for select using (public.is_workspace_member(workspace_id));

create policy "services_insert" on public.services
  for insert with check (public.is_workspace_member(workspace_id));

create policy "services_update" on public.services
  for update using (public.is_workspace_member(workspace_id));

-- Soft delete only — hard delete blocked unless no client_services
create policy "services_delete" on public.services
  for delete using (public.is_workspace_admin(workspace_id));

-- ─── 3. Add DELETE policy to recurring_expenses ──────────────
-- Previously missing — soft deactivation via is_active is preferred
-- but hard delete should be admin-only

drop policy if exists "admins can delete recurring_expenses" on public.recurring_expenses;

create policy "admins can delete recurring_expenses" on public.recurring_expenses
  for delete using (public.is_workspace_admin(workspace_id));

-- ─── 4. Add DELETE policy to employees ───────────────────────

drop policy if exists "admins can delete employees" on public.employees;

create policy "admins can delete employees" on public.employees
  for delete using (public.is_workspace_admin(workspace_id));

-- ─── 5. Add DELETE policy to clients ─────────────────────────

drop policy if exists "members can delete clients" on public.clients;

create policy "members can delete clients" on public.clients
  for delete using (public.is_workspace_member(workspace_id));

-- ─── 6. Add DELETE policy to client_services ─────────────────

drop policy if exists "members can delete client_services" on public.client_services;

create policy "members can delete client_services" on public.client_services
  for delete using (public.is_workspace_member(workspace_id));

-- ─── 7. Fix generate_monthly_receivables to use client_services.price ──

-- Current implementation uses a fixed amount per client_service.
-- It should use client_services.price (custom price) not base service price.
-- The existing generate_monthly_receivables already reads from client_services.price
-- so we just need to verify it uses the right field.

create or replace function public.generate_monthly_receivables(
  p_workspace_id uuid,
  p_month        int,
  p_year         int
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_created  int := 0;
  v_skipped  int := 0;
  v_cs       record;
  v_due_date date;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;

  for v_cs in
    select
      cs.id                                                as client_service_id,
      cs.client_id,
      cs.price                                             as amount,  -- custom price per client
      cs.currency,
      cs.billing_day,
      cs.billing_frequency,
      coalesce(s.name, 'Servicio')                         as service_name,
      c.name                                               as client_name,
      c.company_name
    from public.client_services cs
    join public.clients  c on c.id  = cs.client_id
    join public.services s on s.id  = cs.service_id
    where cs.workspace_id = p_workspace_id
      and cs.status       = 'ACTIVE'
      and (cs.end_date is null or cs.end_date >= make_date(p_year, p_month, 1))
      and cs.start_date   <= make_date(p_year, p_month,
            least(cs.billing_day, extract(day from (date_trunc('month', make_date(p_year, p_month, 1)) + interval '1 month' - interval '1 day'))::int))
      and cs.billing_frequency in ('MONTHLY')
  loop
    -- Check for duplicate
    if exists (
      select 1 from public.receivables
      where workspace_id     = p_workspace_id
        and client_service_id = v_cs.client_service_id
        and period_month      = p_month
        and period_year       = p_year
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_due_date := make_date(p_year, p_month,
      least(coalesce(v_cs.billing_day, 1),
            extract(day from (date_trunc('month', make_date(p_year, p_month, 1)) + interval '1 month' - interval '1 day'))::int));

    insert into public.receivables (
      workspace_id, client_id, client_service_id, description,
      amount, currency, due_date, period_month, period_year
    ) values (
      p_workspace_id,
      v_cs.client_id,
      v_cs.client_service_id,
      coalesce(v_cs.company_name, v_cs.client_name) || ' — ' || v_cs.service_name ||
        ' (' || to_char(make_date(p_year, p_month, 1), 'Mon YYYY') || ')',
      v_cs.amount,           -- uses custom price from client_services
      v_cs.currency,
      v_due_date,
      p_month,
      p_year
    );

    v_created := v_created + 1;
  end loop;

  return jsonb_build_object('created', v_created, 'skipped', v_skipped);
end;
$$;

revoke all on function public.generate_monthly_receivables(uuid,int,int) from public, anon;
grant execute on function public.generate_monthly_receivables(uuid,int,int) to authenticated;
