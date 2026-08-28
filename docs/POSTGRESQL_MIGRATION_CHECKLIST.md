# PostgreSQL Migration Checklist

Estado: **PENDIENTE** — El frontend funciona con mocks + localStorage. Este documento lista todo lo que debe hacerse al conectar la base de datos real.

---

## 1. Datos actualmente en localStorage

| Key                        | Descripción                      | Modelo Prisma futuro         |
|---------------------------|----------------------------------|------------------------------|
| `finanzas:purchases`      | Lista de compras pendientes       | `PurchaseItem`               |
| `finanzas:reminders`      | Recordatorios manuales            | `Reminder`                   |
| `finanzas:userPrefs`      | Preferencias de UI del usuario    | `UserProfile` / `UserSettings` |
| `finanzas:focusMode`      | Estado del modo enfoque           | `UserSettings.focusMode`     |
| `finanzas:sidebar:*`      | Estado del sidebar                | No persistir en DB (solo UI) |
| `finanzas:session`        | Sesión de autenticación mock      | JWT / cookies HttpOnly       |

---

## 2. Modelos que ya existen en Prisma (`prisma/schema.prisma`)

- `User`, `WorkspaceMember`, `Workspace`
- `Transaction`, `Category`, `Account`
- `Client`, `Service`, `ClientService`, `Receivable`, `ClientPayment`
- `Employee`, `PayrollRule`, `PayrollObligation`, `PayrollPayment`
- `RecurringExpense`, `RecurringExpenseObligation`
- `Debt`, `DebtInstallment`, `DebtPayment`
- `AuditLog`, `ImportBatch`

## 3. Modelos que FALTA crear

- `PurchaseItem` — conversión de `purchaseStore.ts`
- `Reminder` — conversión de `reminderStore.ts`
- `UserSettings` — almacenar `currency`, `defaultWorkspace`, `notifEnabled`, `focusMode`
- `Notification` — notificaciones persistentes (actualmente mock en `notifications.mock.ts`)

---

## 4. IDs a preservar

Los IDs actuales de localStorage son generados con `uid()` (base36 + timestamp). Al migrar, se pueden conservar o regenerar UUIDs v4. Se recomienda usar UUID v4 en PostgreSQL.

---

## 5. Relaciones a revisar

- `PurchaseItem.transactionId` → FK a `Transaction.id` (cuando se convierte en gasto)
- `Reminder.sourceId` + `sourceType` → relación polimórfica (PAYROLL, DEBT, CASHEA, etc.)
- `Notification.link` → referencia interna a rutas de la app

---

## 6. Mocks a eliminar al conectar DB

| Archivo                           | Razón de eliminación                              |
|----------------------------------|---------------------------------------------------|
| `src/mocks/notifications.mock.ts` | Reemplazar con API `/api/notifications`            |
| `src/mocks/fernandoAds.mock.ts`  | `businessSummaryRows`, `adsPendingClients` → API  |
| `src/mocks/dashboard.mock.ts`    | `upcomingPayments` → ya se consume de API         |
| `src/mocks/calendar.mock.ts`     | Combinar con datos reales de DB                   |
| `src/mocks/personal.mock.ts`     | Ya no se usa activamente (verificar y eliminar)   |
| `src/types/auth.ts` (MOCK_USERS) | Reemplazar con autenticación real (JWT/bcrypt)    |
| `src/context/AuthContext.tsx`    | Eliminar fallback mock (`mockLogin`)               |

---

## 7. Servicios frontend a actualizar

Al conectar DB, estos servicios ya tienen la estructura lista para consumir la API real:

- `src/services/transactions.service.ts` ✅
- `src/services/clients.service.ts` ✅
- `src/services/employees.service.ts` ✅
- `src/services/debts.service.ts` ✅
- `src/services/payroll.service.ts` ✅
- `src/services/receivables.service.ts` ✅
- `src/services/accounts.service.ts` ✅
- `src/services/dashboard.service.ts` ✅

Pendientes de crear (actualmente localStorage):
- `src/services/purchases.service.ts` — cuando exista el modelo en DB
- `src/services/reminders.service.ts` — cuando exista el modelo en DB
- `src/services/notifications.service.ts`

---

## 8. Comandos al activar PostgreSQL

```bash
# 1. Configurar .env con DATABASE_URL real
# 2. Ejecutar migraciones
npx prisma migrate deploy

# 3. Cargar seed inicial
npx prisma db seed

# 4. Ejecutar scripts de generación inicial
npx tsx prisma/billing-script.ts
npx tsx prisma/payroll-script.ts
npx tsx prisma/recurring-script.ts
```

---

## 9. Reglas de negocio críticas a mantener

- Saldo de cuenta: SOLO calculado en `accountBalance.service.ts` (nunca en el frontend)
- `PurchaseItem` ≠ `Transaction` — solo se convierte en Transaction al marcar como comprada
- `Reminder` ≠ `Transaction` — son entidades separadas
- `PayrollObligation` ≠ `Expense` — solo el pago real crea Transaction
- `DebtInstallment` ≠ `Expense` — solo `DebtPayment` crea Transaction

---

## 10. Precisión financiera

Actualmente el frontend usa `Number` para montos. Al conectar DB:
- PostgreSQL: usar `DECIMAL(18,2)` o `NUMERIC` (ya en el schema como `Decimal`)
- Frontend: considerar librería `decimal.js` para operaciones críticas
- Evitar: `0.1 + 0.2 === 0.3` en cálculos de balances
