-- ============================================================
-- MIGRACIÓN 002: Row Level Security (RLS)
-- Ejecutar DESPUÉS de la migración 001
-- ============================================================

-- ─── Habilitar RLS en todas las tablas ───────────────────────
alter table public.profiles           enable row level security;
alter table public.workspaces         enable row level security;
alter table public.workspace_members  enable row level security;
alter table public.accounts           enable row level security;
alter table public.categories         enable row level security;
alter table public.transactions       enable row level security;

-- ─── Función auxiliar: ¿el usuario actual es miembro del workspace? ─
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
  );
$$;

-- ─── Función auxiliar: ¿el usuario tiene rol >= ADMIN en el workspace? ─
create or replace function public.is_workspace_admin(p_workspace_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
      and role in ('OWNER', 'ADMIN')
  );
$$;

-- ─── POLICIES: profiles ───────────────────────────────────────
create policy "users can read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "users can insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

-- ─── POLICIES: workspaces ─────────────────────────────────────
create policy "members can read their workspaces"
  on public.workspaces for select
  using (public.is_workspace_member(id));

create policy "admins can update their workspaces"
  on public.workspaces for update
  using (public.is_workspace_admin(id))
  with check (public.is_workspace_admin(id));

-- INSERT de workspaces solo via service_role (desde funciones RPC seguras)
create policy "service role can insert workspaces"
  on public.workspaces for insert
  with check (false);  -- bloquear desde frontend; usar función de inicialización

-- ─── POLICIES: workspace_members ─────────────────────────────
create policy "members can read their own memberships"
  on public.workspace_members for select
  using (user_id = auth.uid());

create policy "admins can read all members of their workspace"
  on public.workspace_members for select
  using (public.is_workspace_admin(workspace_id));

-- INSERT y DELETE solo via service_role (provisioning inicial)
create policy "service role can manage members"
  on public.workspace_members for all
  using (false)
  with check (false);

-- ─── POLICIES: accounts ───────────────────────────────────────
create policy "members can read accounts"
  on public.accounts for select
  using (public.is_workspace_member(workspace_id));

create policy "admins can insert accounts"
  on public.accounts for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "admins can update accounts"
  on public.accounts for update
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy "admins can delete accounts"
  on public.accounts for delete
  using (public.is_workspace_admin(workspace_id));

-- ─── POLICIES: categories ─────────────────────────────────────
-- Categorías del sistema (workspace_id IS NULL): todos los usuarios autenticados las ven
create policy "all authenticated users can read system categories"
  on public.categories for select
  using (workspace_id is null or public.is_workspace_member(workspace_id));

create policy "admins can insert custom categories"
  on public.categories for insert
  with check (workspace_id is not null and public.is_workspace_admin(workspace_id));

create policy "admins can update custom categories"
  on public.categories for update
  using (workspace_id is not null and public.is_workspace_admin(workspace_id))
  with check (workspace_id is not null and public.is_workspace_admin(workspace_id));

-- ─── POLICIES: transactions ───────────────────────────────────
create policy "members can read transactions"
  on public.transactions for select
  using (public.is_workspace_member(workspace_id));

create policy "members can insert transactions"
  on public.transactions for insert
  with check (public.is_workspace_member(workspace_id));

create policy "members can update transactions"
  on public.transactions for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- No permitir DELETE de transacciones desde UI (usar CANCELLED)
create policy "admins can delete transactions"
  on public.transactions for delete
  using (public.is_workspace_admin(workspace_id));
