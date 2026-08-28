# Reglas de Negocio Financieras

## Cálculo de Saldo de Cuenta

```
currentBalance = initialBalance
              + SUM(amount WHERE type=INCOME  AND status=COMPLETED)
              - SUM(amount WHERE type=EXPENSE AND status=COMPLETED)
```

Implementado en: `server/src/services/accountBalance.service.ts`

### Estados que afectan el saldo
| Status     | Afecta saldo | Descripción                     |
|------------|:------------:|---------------------------------|
| COMPLETED  | ✅           | Movimiento realizado            |
| PENDING    | ❌           | No afecta saldo disponible      |
| CANCELLED  | ❌           | Movimiento anulado              |

## Tipos de Transacción
- `INCOME`: Ingreso → suma al saldo de la cuenta
- `EXPENSE`: Gasto → resta del saldo de la cuenta

## Filtrado por workspace
Todas las consultas financieras son aisladas por `workspaceId`.
Nunca se mezclan datos entre workspaces (Personal, Fernando ADS, etc.)

## Transferencias
Las transferencias entre cuentas usan el modelo `Transfer` separado.
NO se representan como INCOME/EXPENSE para no distorsionar los cálculos.
(Implementación completa en Hito futuro)

## Soft Delete
Los movimientos financieros NO se eliminan desde la UI — se anulan con `status = CANCELLED`.
La API expone `DELETE` solo para uso administrativo.

---

## Facturado vs Cobrado (Hito 4)

- **FACTURADO** = SUM(receivable.amount) WHERE dueDate in range AND status != CANCELLED
- **COBRADO**   = SUM(clientPayment.amount) WHERE paymentDate in range
- Fechas distintas: pago de enero cobrado en febrero aumenta COBRADO de febrero.

## Flujo de Pago de Cliente

1. ClientPayment.register → Crear ClientPayment
2. Receivable.amountPaid += amount → recalcular status (PENDING→PARTIAL→PAID)
3. Transaction INCOME creada automáticamente (vinculada via transactionId)

## Estado OVERDUE

OVERDUE es dinámico: `dueDate < hoy && status != PAID && status != CANCELLED`
El DB almacena PENDING/PARTIAL/PAID/CANCELLED solamente.

## Rentabilidad por Cliente (estimada)

```
margen = SUM(clientPayment) - SUM(transaction EXPENSE WHERE clientId)
```
Solo costos directos — NO incluye costos generales. Llamar "Rentabilidad estimada".

## Anti-duplicados de cobros mensuales

`@@unique([clientServiceId, periodMonth, periodYear])` previene cobros duplicados.
