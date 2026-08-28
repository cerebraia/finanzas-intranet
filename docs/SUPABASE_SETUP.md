# Guía de configuración Supabase

## Prerequisitos

- Proyecto Supabase creado en [supabase.com](https://supabase.com)
- Node.js 18+

---

## 1. Variables de entorno

Crear `.env` en la raíz del proyecto (copiar desde `.env.example`):

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

Obtener los valores en: **Supabase Dashboard → Project Settings → API**

**Regla crítica:** NUNCA usar `SUPABASE_SERVICE_ROLE_KEY` en variables `VITE_`.
El service role queda expuesto en el bundle del navegador.

---

## 2. Aplicar migraciones SQL

Ejecutar en orden en **Supabase Dashboard → SQL Editor → New query**:

### 2.1 Schema inicial (Hito 12)
Pegar y ejecutar: `supabase/migrations/20260815_001_initial_schema.sql`

Crea: extensiones, enums, tablas `profiles`, `workspaces`, `workspace_members`,
`accounts`, `categories`, `transactions`, triggers de `updated_at`,
trigger de creación automática de `profile`, función RPC `get_workspace_balance`.

### 2.2 RLS Policies
Pegar y ejecutar: `supabase/migrations/20260815_002_rls_policies.sql`

Activa RLS en todas las tablas y crea las policies de seguridad.

### 2.3 Categorías del sistema (seed)
Pegar y ejecutar: `supabase/migrations/20260815_003_seed_categories.sql`

Inserta 13 categorías de gasto y 6 de ingreso con `workspace_id = NULL`
(disponibles para todos los workspaces).

### 2.4 Función de provisioning de workspaces
Pegar y ejecutar: `supabase/migrations/20260815_004_workspace_provisioning.sql`

Crea la función `create_workspace_with_owner` que permite crear workspaces
desde el frontend de forma segura (SECURITY DEFINER).

### 2.5 Schema módulos de negocio (Hito 13)
Pegar y ejecutar: `supabase/migrations/20260815_005_business_schema.sql`

Crea: `audit_logs`, `services`, `clients`, `client_services`, `receivables`,
`client_payments`, `employees`, `payroll_rules`, `payroll_obligations`,
`payroll_payments`, `recurring_expenses`, `recurring_expense_obligations`.

### 2.6 RLS módulos de negocio
Pegar y ejecutar: `supabase/migrations/20260815_006_business_rls.sql`

Activa RLS y crea policies para todas las tablas de negocio.

### 2.7 Funciones atómicas de pago
Pegar y ejecutar: `supabase/migrations/20260815_007_atomic_functions.sql`

Crea funciones SECURITY DEFINER para operaciones financieras atómicas:
`register_client_payment`, `cancel_client_payment`, `register_payroll_payment`,
`cancel_payroll_payment`, `pay_recurring_expense`, `generate_monthly_receivables`,
`generate_payroll_obligations`, `generate_recurring_obligations`.

### 2.8 Analytics y pending items
Pegar y ejecutar: `supabase/migrations/20260815_008_analytics_views.sql`

Crea: `get_pending_items`, `get_business_dashboard`, `get_client_profitability`.

---

## 2.9 Crear catálogo de servicios (Fernando ADS)

Después de crear el workspace Fernando ADS, ejecutar en SQL Editor
(reemplazar `<WORKSPACE_UUID_FERNANDO_ADS>` con el UUID real):

```sql
insert into public.services (workspace_id, name, description) values
  ('<WORKSPACE_UUID_FERNANDO_ADS>', 'Meta Ads',              'Publicidad en Facebook e Instagram'),
  ('<WORKSPACE_UUID_FERNANDO_ADS>', 'Google Ads',            'Publicidad en buscadores'),
  ('<WORKSPACE_UUID_FERNANDO_ADS>', 'Consultoría',           'Sesiones de consultoría digital'),
  ('<WORKSPACE_UUID_FERNANDO_ADS>', 'Desarrollo Web',        'Desarrollo y mantenimiento web'),
  ('<WORKSPACE_UUID_FERNANDO_ADS>', 'Automatizaciones / IA', 'Flujos y automatizaciones'),
  ('<WORKSPACE_UUID_FERNANDO_ADS>', 'Edición de Video',      'Edición y producción de contenido'),
  ('<WORKSPACE_UUID_FERNANDO_ADS>', 'Marketing',             'Estrategia y marketing general'),
  ('<WORKSPACE_UUID_FERNANDO_ADS>', 'Otros',                 null);
```

---

## 3. Crear el primer usuario administrador

1. Ir a **Supabase Dashboard → Authentication → Users → Add user**
2. Ingresar: email y contraseña
3. El trigger `on_auth_user_created` creará automáticamente el profile

**O** usar el formulario de Register en `/register` de la app (si está habilitado).

---

## 4. Crear los workspaces iniciales

Después de crear el usuario y autenticarte en la app, ejecutar en el SQL Editor:

```sql
-- Reemplazar <USER_UUID> con el ID del usuario de auth.users
-- Workspace Personal
select public.create_workspace_with_owner(
  'Personal',
  'personal',
  'PERSONAL',
  '👤'
);

-- Workspace Fernando ADS
select public.create_workspace_with_owner(
  'Fernando ADS',
  'fernando-ads',
  'BUSINESS',
  '📢'
);
```

**Nota:** Esta función asigna el usuario autenticado como OWNER.
Dado que usa `auth.uid()`, debes ejecutarla desde la sesión del usuario
(no es posible ejecutarla directamente como admin en SQL Editor sin contexto de auth).

**Alternativa segura:** Crear workspaces directamente vía SQL como service_role:

```sql
-- Como service_role (Supabase SQL Editor lo ejecuta con permisos completos)
insert into public.workspaces (name, slug, type, emoji)
values ('Personal', 'personal', 'PERSONAL', '👤'),
       ('Fernando ADS', 'fernando-ads', 'BUSINESS', '📢');

-- Asignar al usuario como OWNER
-- Reemplazar <USER_UUID> con el UUID del usuario
insert into public.workspace_members (workspace_id, user_id, role)
select id, '<USER_UUID>', 'OWNER'
from public.workspaces
where slug in ('personal', 'fernando-ads');
```

---

## 5. Generar tipos TypeScript automáticamente (cuando tengas CLI)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Generar tipos
npx supabase gen types typescript \
  --project-id tu-project-id \
  > src/types/database.types.ts
```

Por ahora los tipos en `src/types/database.types.ts` son manuales.

---

## 6. Validar RLS

### Test de aislamiento de workspaces

En el SQL Editor con el anon key (o desde la app logueada como Usuario A):

```sql
-- Usuario A solo debe ver sus propios workspaces
select * from public.workspaces;     -- solo los suyos
select * from public.accounts;       -- solo los de sus workspaces
select * from public.transactions;   -- solo los de sus workspaces
```

Si aparecen datos de otros usuarios → revisar las policies.

### Test de acceso cruzado (debe fallar)

```sql
-- Intentar leer workspace ajeno directamente
select * from public.accounts where workspace_id = 'uuid-de-otro-workspace';
-- Resultado esperado: 0 filas (RLS filtra)
```

---

## 7. Iniciar el proyecto

```bash
# Instalar dependencias
npm install

# Configurar .env con tus credenciales Supabase

# Iniciar solo el frontend (para módulos migrados a Supabase)
npm run dev:client

# Si necesitas también el backend Express (módulos no migrados):
npm run dev
```

---

## 8. Estructura de archivos Supabase

```
src/
  lib/supabase.ts          ← cliente Supabase configurado
  types/database.types.ts  ← tipos manuales (reemplazar con codegen)
  services/
    accounts.service.ts    ← Supabase (migrado)
    categories.service.ts  ← Supabase (migrado)
    transactions.service.ts← Supabase (migrado)
    dashboard.service.ts   ← Supabase (migrado)
    workspaces.service.ts  ← Supabase (nuevo)
    clients.service.ts     ← Express/Prisma (no migrado)
    employees.service.ts   ← Express/Prisma (no migrado)
    ...
  context/
    AuthContext.tsx         ← Supabase Auth (migrado)
    WorkspaceContext.tsx    ← Supabase (migrado)

supabase/
  migrations/
    20260815_001_initial_schema.sql
    20260815_002_rls_policies.sql
    20260815_003_seed_categories.sql
    20260815_004_workspace_provisioning.sql
```

---

## 9. Seguridad — checklist

- [x] `VITE_SUPABASE_ANON_KEY` solo para el frontend (published key)
- [x] `SUPABASE_SERVICE_ROLE_KEY` nunca en variables `VITE_`
- [x] RLS habilitado en todas las tablas
- [x] Policies creadas para profiles, workspaces, workspace_members, accounts, categories, transactions
- [x] El trigger de `profiles` usa `SECURITY DEFINER` con `search_path` explícito
- [x] La función `create_workspace_with_owner` valida `auth.uid()` antes de insertar
- [x] `.env` en `.gitignore`

---

## 10. Backup

Supabase incluye backups automáticos en el plan Pro.
Para el plan free: **Supabase Dashboard → Project Settings → Database → Backups**.

Manual via Supabase CLI:
```bash
supabase db dump -f backup_$(date +%Y%m%d).sql
```
