# Migración de localStorage a Supabase

## Resumen

Este documento clasifica cada clave de localStorage del proyecto:
qué puede descartarse, qué debe conservarse y qué se ha migrado a Supabase.

---

## Claves definidas en `src/lib/storage.ts`

| Clave | Descripción | Decisión |
|-------|-------------|----------|
| `finanzas:session` | Sesión de usuario (JWT + perfil) | **Eliminar** — Supabase Auth maneja la sesión en su propio storage (`sb-*` keys) |
| `finanzas:focusMode` | Estado del modo enfoque (true/false) | **Conservar** — preferencia de UI, no dato financiero |
| `finanzas:userPrefs` | Preferencias del usuario | **Conservar** — preferencia de UI |
| `finanzas:purchases` | Lista de items "Por comprar" | **TODO migrar** — módulo Purchases sigue en localStorage |
| `finanzas:reminders` | Recordatorios | **TODO migrar** — módulo Reminders sigue en localStorage |
| `finanzas:sidebar:collapsed` | Estado colapsado del sidebar | **Conservar** — preferencia de UI |
| `finanzas:sidebar:sections` | Secciones del sidebar abiertas/cerradas | **Conservar** — preferencia de UI |
| `finanzas:version` | Versión del schema de localStorage | **Conservar** — para migraciones futuras |
| `finanzas:workspace:selected` | ID del workspace activo | **Conservar** — preferencia de UI, datos reales vienen de Supabase |

---

## Estado post-Hito 12

### Migrado a Supabase
- **Auth / Session** → Supabase Auth (`supabase.auth.getSession()`)
- **Workspaces** → tabla `workspaces` + `workspace_members`
- **Accounts** → tabla `accounts`
- **Categories** → tabla `categories`
- **Transactions** → tabla `transactions`
- **Profiles** → tabla `profiles`

### Sigue en localStorage (temporal)
- **Por comprar** (`finanzas:purchases`) — `src/stores/purchaseStore.ts`
- **Recordatorios** (`finanzas:reminders`) — parte de `purchaseStore.ts`

### Permanece en localStorage (preferencias de UI)
- `finanzas:focusMode`
- `finanzas:userPrefs`
- `finanzas:sidebar:collapsed`
- `finanzas:sidebar:sections`
- `finanzas:workspace:selected`
- `finanzas:version`

---

## Dato que NO debe estar en localStorage

A partir del Hito 12:

- Ninguna transacción financiera real
- Ningún saldo de cuenta
- Ningún dato de cliente, empleado, deuda o nómina
- Ninguna credencial ni token de sesión (ahora en Supabase Auth)

---

## Migración pendiente — Por Comprar y Recordatorios

Cuando se migre el módulo Purchases/Reminders a Supabase:

1. Crear tabla `purchase_items` en Supabase
2. Crear tabla `reminders` en Supabase
3. Script de migración one-time:
   ```typescript
   // Leer datos existentes en localStorage
   const stored = localStorage.getItem('finanzas:purchases')
   if (stored) {
     const items = JSON.parse(stored)
     // Insertar en Supabase con el workspace correcto
     await supabase.from('purchase_items').insert(items.map(mapToRow))
     // Solo después de confirmar éxito:
     localStorage.removeItem('finanzas:purchases')
   }
   ```
4. Eliminar `src/stores/purchaseStore.ts` (o conservarlo solo para offline)

---

## Script de limpieza (ejecutar en consola del navegador)

Solo después de confirmar que Supabase tiene todos los datos correctos:

```javascript
// Limpiar sesión antigua (ya no se usa con Supabase Auth)
localStorage.removeItem('finanzas:session')

// Verificar que Supabase tenga sesión activa antes de limpiar
const { data: { session } } = await supabase.auth.getSession()
console.log('Sesión Supabase:', session ? 'activa' : 'no hay sesión')
```

**No ejecutar** `localStorage.clear()` — eliminaría también las preferencias de UI.
