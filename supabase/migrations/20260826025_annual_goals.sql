-- ============================================================
-- MIGRACIÓN 025: Metas del Año (Annual Goals)
-- Tablas: annual_goals, annual_goal_milestones
-- RLS via is_workspace_member
-- RPCs: complete_annual_goal, update_annual_goal_progress,
--        toggle_milestone, get_annual_goals_summary
-- ============================================================

-- ─── 1. ENUMS ────────────────────────────────────────────────

do $$ begin
  create type public.annual_goal_category as enum (
    'PERSONAL','FAMILY','FINANCIAL','BUSINESS',
    'HEALTH','EDUCATION','PURCHASE','TRAVEL','PROJECT','OTHER'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.annual_goal_status as enum (
    'NOT_STARTED','IN_PROGRESS','COMPLETED','PAUSED','CANCELLED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.annual_goal_priority as enum (
    'LOW','MEDIUM','HIGH','CRITICAL'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.annual_goal_progress_mode as enum (
    'MANUAL','MILESTONES'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.milestone_status as enum (
    'PENDING','COMPLETED'
  );
exception when duplicate_object then null; end $$;

-- ─── 2. TABLA annual_goals ───────────────────────────────────

create table if not exists public.annual_goals (
  id                    uuid                            primary key default gen_random_uuid(),
  workspace_id          uuid                            not null references public.workspaces(id) on delete cascade,
  title                 text                            not null,
  description           text,
  year                  integer                         not null default extract(year from current_date)::integer,
  category              public.annual_goal_category     not null default 'PERSONAL',
  priority              public.annual_goal_priority     not null default 'MEDIUM',
  status                public.annual_goal_status       not null default 'NOT_STARTED',
  progress              integer                         not null default 0 check (progress >= 0 and progress <= 100),
  progress_mode         public.annual_goal_progress_mode not null default 'MANUAL',
  is_focus              boolean                         not null default false,
  target_date           date,
  started_at            date,
  completed_at          timestamptz,
  progress_updated_at   timestamptz,
  financial_goal_id     uuid                            references public.financial_goals(id) on delete set null,
  purchase_item_id      uuid                            references public.purchase_items(id) on delete set null,
  carry_over_from_goal_id uuid                          references public.annual_goals(id) on delete set null,
  notes                 text,
  created_by            uuid                            references auth.users(id),
  created_at            timestamptz                     not null default now(),
  updated_at            timestamptz                     not null default now()
);

create index if not exists idx_annual_goals_workspace_year on public.annual_goals(workspace_id, year);
create index if not exists idx_annual_goals_workspace_status on public.annual_goals(workspace_id, status);
create index if not exists idx_annual_goals_is_focus on public.annual_goals(workspace_id, is_focus) where is_focus = true;
create index if not exists idx_annual_goals_target_date on public.annual_goals(workspace_id, target_date) where target_date is not null;

create trigger trg_annual_goals_updated_at
  before update on public.annual_goals
  for each row execute function public.set_updated_at();

-- ─── 3. TABLA annual_goal_milestones ─────────────────────────

create table if not exists public.annual_goal_milestones (
  id           uuid                      primary key default gen_random_uuid(),
  workspace_id uuid                      not null references public.workspaces(id) on delete cascade,
  goal_id      uuid                      not null references public.annual_goals(id) on delete cascade,
  title        text                      not null,
  description  text,
  status       public.milestone_status   not null default 'PENDING',
  target_date  date,
  completed_at timestamptz,
  sort_order   integer                   not null default 0,
  created_at   timestamptz               not null default now(),
  updated_at   timestamptz               not null default now()
);

create index if not exists idx_milestones_goal_id on public.annual_goal_milestones(goal_id, sort_order);

create trigger trg_milestones_updated_at
  before update on public.annual_goal_milestones
  for each row execute function public.set_updated_at();

-- ─── 4. RLS — annual_goals ───────────────────────────────────

alter table public.annual_goals enable row level security;

create policy "annual_goals_select" on public.annual_goals
  for select using (public.is_workspace_member(workspace_id));

create policy "annual_goals_insert" on public.annual_goals
  for insert with check (public.is_workspace_member(workspace_id));

create policy "annual_goals_update" on public.annual_goals
  for update using (public.is_workspace_member(workspace_id));

create policy "annual_goals_delete" on public.annual_goals
  for delete using (public.is_workspace_member(workspace_id));

-- ─── 5. RLS — annual_goal_milestones ─────────────────────────

alter table public.annual_goal_milestones enable row level security;

create policy "milestones_select" on public.annual_goal_milestones
  for select using (public.is_workspace_member(workspace_id));

create policy "milestones_insert" on public.annual_goal_milestones
  for insert with check (public.is_workspace_member(workspace_id));

create policy "milestones_update" on public.annual_goal_milestones
  for update using (public.is_workspace_member(workspace_id));

create policy "milestones_delete" on public.annual_goal_milestones
  for delete using (public.is_workspace_member(workspace_id));

-- ─── 6. RPC: complete_annual_goal ────────────────────────────

create or replace function public.complete_annual_goal(
  p_goal_id uuid
)
returns public.annual_goals
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_goal public.annual_goals;
begin
  -- Verify access
  select * into v_goal from public.annual_goals where id = p_goal_id;
  if not found then
    raise exception 'Meta no encontrada';
  end if;
  if not public.is_workspace_member(v_goal.workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;

  update public.annual_goals
  set
    status              = 'COMPLETED',
    progress            = 100,
    completed_at        = now(),
    progress_updated_at = now(),
    updated_at          = now()
  where id = p_goal_id
  returning * into v_goal;

  return v_goal;
end;
$$;

-- ─── 7. RPC: update_annual_goal_progress ─────────────────────

create or replace function public.update_annual_goal_progress(
  p_goal_id uuid,
  p_progress integer,
  p_status   public.annual_goal_status default null
)
returns public.annual_goals
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_goal   public.annual_goals;
  v_status public.annual_goal_status;
begin
  if p_progress < 0 or p_progress > 100 then
    raise exception 'El progreso debe estar entre 0 y 100';
  end if;

  select * into v_goal from public.annual_goals where id = p_goal_id;
  if not found then
    raise exception 'Meta no encontrada';
  end if;
  if not public.is_workspace_member(v_goal.workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;

  -- Determine status
  if p_status is not null then
    v_status := p_status;
  else
    v_status := v_goal.status;
    if p_progress > 0 and v_status = 'NOT_STARTED' then
      v_status := 'IN_PROGRESS';
    end if;
  end if;

  update public.annual_goals
  set
    progress            = p_progress,
    status              = v_status,
    progress_updated_at = now(),
    completed_at        = case when v_status = 'COMPLETED' then now() else completed_at end,
    updated_at          = now()
  where id = p_goal_id
  returning * into v_goal;

  return v_goal;
end;
$$;

-- ─── 8. RPC: toggle_milestone ────────────────────────────────

create or replace function public.toggle_milestone(
  p_milestone_id uuid
)
returns public.annual_goal_milestones
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_m    public.annual_goal_milestones;
  v_goal public.annual_goals;
  v_total integer;
  v_done  integer;
begin
  select * into v_m from public.annual_goal_milestones where id = p_milestone_id;
  if not found then raise exception 'Hito no encontrado'; end if;

  select * into v_goal from public.annual_goals where id = v_m.goal_id;
  if not public.is_workspace_member(v_m.workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;

  if v_m.status = 'PENDING' then
    update public.annual_goal_milestones
    set status = 'COMPLETED', completed_at = now(), updated_at = now()
    where id = p_milestone_id
    returning * into v_m;
  else
    update public.annual_goal_milestones
    set status = 'PENDING', completed_at = null, updated_at = now()
    where id = p_milestone_id
    returning * into v_m;
  end if;

  -- Recalculate progress if goal is in MILESTONES mode
  if v_goal.progress_mode = 'MILESTONES' then
    select count(*), count(*) filter (where status = 'COMPLETED')
    into v_total, v_done
    from public.annual_goal_milestones
    where goal_id = v_goal.id;

    if v_total > 0 then
      update public.annual_goals
      set
        progress            = (v_done * 100 / v_total),
        progress_updated_at = now(),
        updated_at          = now()
      where id = v_goal.id;
    end if;
  end if;

  return v_m;
end;
$$;

-- ─── 9. RPC: get_annual_goals_summary ────────────────────────

create or replace function public.get_annual_goals_summary(
  p_workspace_id uuid,
  p_year         integer
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result json;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso a este workspace';
  end if;

  select json_build_object(
    'total',       count(*),
    'completed',   count(*) filter (where status = 'COMPLETED'),
    'in_progress', count(*) filter (where status = 'IN_PROGRESS'),
    'not_started', count(*) filter (where status = 'NOT_STARTED'),
    'paused',      count(*) filter (where status = 'PAUSED'),
    'cancelled',   count(*) filter (where status = 'CANCELLED'),
    'overdue',     count(*) filter (
                     where target_date < current_date
                       and status not in ('COMPLETED', 'CANCELLED')
                   ),
    'due_soon',    count(*) filter (
                     where target_date between current_date and current_date + interval '30 days'
                       and status not in ('COMPLETED', 'CANCELLED')
                   )
  )
  into v_result
  from public.annual_goals
  where workspace_id = p_workspace_id
    and year = p_year;

  return v_result;
end;
$$;
