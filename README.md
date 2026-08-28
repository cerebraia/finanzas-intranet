# Finanzas Intranet

Intranet financiera personal y de negocios — gestión integral de finanzas personales y de Fernando ADS.

## Stack

- **Frontend:** Vite 5 + React 18 + TypeScript + Tailwind CSS v3 + React Router v6
- **Gráficos:** Recharts
- **Estado del servidor:** TanStack Query (React Query)
- **UI primitivos:** Radix UI (Dialog, Dropdown)
- **Notificaciones:** Sonner
- **Backend:** Express + TypeScript (modo mock — PostgreSQL pendiente)
- **ORM:** Prisma v5 (schema listo, DB pendiente)
- **Iconos:** Lucide React

## Instalación

```bash
npm install
```

## Desarrollo

```bash
# Solo frontend (modo mock)
npm run dev

# Frontend + backend Express
npm run dev:full
```

## Build de producción

```bash
npm run build
# Salida en dist/
```

## Estructura del proyecto

```
src/
├── App.tsx              — Router principal con lazy loading
├── components/
│   ├── layout/          — MainLayout, Sidebar, Header, BottomNav
│   ├── ui/              — Button, Badge, Card, ConfirmDialog, ErrorBoundary, etc.
│   ├── dashboard/       — Widgets del dashboard
│   └── modals/          — Modales de formularios
├── context/             — AuthContext, WorkspaceContext, AppContext
├── hooks/               — useTransactions, usePurchases, useSidebar, etc.
├── lib/
│   ├── utils.ts         — cn(), formatCurrency(), toDateString(), formatRelativeDate()
│   └── storage.ts       — STORAGE_KEYS centralizadas
├── mocks/               — Datos mock (temporales hasta PostgreSQL)
├── pages/               — Una carpeta por página
├── services/            — Servicios de API (listos para backend real)
├── stores/              — purchaseStore, reminderStore (localStorage)
└── types/               — Tipos TypeScript (api.ts, auth.ts, purchases.ts)
```

## Módulos

| Sección | Estado |
|---|---|
| Dashboard | ✅ API real (con fallback mock) |
| Ingresos / Gastos / Movimientos | ✅ API real |
| Cuentas | ✅ API real |
| Clientes / Cuentas por cobrar | ✅ API real |
| Nómina / Equipo | ✅ API real |
| Gastos fijos | ✅ API real |
| Deudas / Cashea / SAN | ✅ API real |
| Pendientes | ✅ API real |
| Por comprar | ✅ localStorage |
| Recordatorios | ✅ localStorage |
| Calendario | ✅ Mock + localStorage |
| Notificaciones | 🔶 Mock |
| Reportes | 🔶 Stub (pendiente) |
| Estadísticas | 🔶 Mock estático |
| Presupuestos | 🔶 Stub (pendiente) |
| Configuración | ✅ Con backup local JSON |

## Autenticación

Modo mock activo. Usuarios de prueba definidos en `src/types/auth.ts`.
El sistema intenta la API real primero y hace fallback a mock si no responde.

```
admin@finanzas.app  / admin123   (ADMIN)
owner@finanzas.app  / owner123   (SUPER_ADMIN)
viewer@finanzas.app / viewer123  (VIEWER)
```

## localStorage keys

Todas las keys usan el prefijo `finanzas:` y están centralizadas en `src/lib/storage.ts`.

| Key | Descripción |
|---|---|
| `finanzas:session` | Sesión de autenticación |
| `finanzas:purchases` | Lista de compras pendientes |
| `finanzas:reminders` | Recordatorios |
| `finanzas:userPrefs` | Preferencias de usuario |
| `finanzas:focusMode` | Estado del modo enfoque |
| `finanzas:sidebar:collapsed` | Estado del sidebar |
| `finanzas:sidebar:sections` | Grupos abiertos/cerrados |

## Backup local

En **Configuración → Datos y respaldo local** puedes exportar e importar un archivo JSON con tus datos locales (compras, recordatorios, preferencias).

## Documentación

- `docs/POSTGRESQL_MIGRATION_CHECKLIST.md` — Todo lo necesario para conectar PostgreSQL
- `docs/PRODUCTION_READINESS.md` — Checklist para deploy en VPS
- `docs/API_ROUTES.md` — Rutas del backend
- `docs/BUSINESS_RULES.md` — Reglas de negocio críticas
- `docs/DATABASE_SCHEMA.md` — Esquema de la base de datos

## Estado actual

**Hito 11 — Auditoría, seguridad, UX y estabilización**

- ✅ Build sin errores TypeScript
- ✅ Lazy loading de rutas (bundle principal 334KB vs 1.69MB antes)
- ✅ ErrorBoundary global
- ✅ ConfirmDialog para acciones destructivas
- ✅ STORAGE_KEYS centralizadas
- ✅ Toasts en todas las acciones
- ✅ Backup local JSON (export/import)
- ✅ Docs de migración PostgreSQL y producción
- 🔶 PostgreSQL: pendiente (ver POSTGRESQL_MIGRATION_CHECKLIST.md)
