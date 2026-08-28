# API Routes

Base URL: `http://localhost:3001/api`

## Workspaces
| Method | Path             | Descripción         |
|--------|------------------|---------------------|
| GET    | /workspaces      | Listar workspaces   |

## Accounts
| Method | Path               | Descripción              |
|--------|--------------------|--------------------------|
| GET    | /accounts          | Listar (filtra por ?workspaceId=) |
| GET    | /accounts/:id      | Detalle con saldo calculado |
| POST   | /accounts          | Crear cuenta             |
| PATCH  | /accounts/:id      | Actualizar               |
| DELETE | /accounts/:id      | Eliminar (soft si tiene txs) |

## Categories
| Method | Path               | Descripción              |
|--------|--------------------|--------------------------|
| GET    | /categories        | Listar (?workspaceId=&type=INCOME|EXPENSE) |
| POST   | /categories        | Crear categoría          |

## Transactions
| Method | Path                     | Descripción              |
|--------|--------------------------|--------------------------|
| GET    | /transactions            | Listar con filtros completos |
| GET    | /transactions/:id        | Detalle                  |
| POST   | /transactions            | Crear movimiento         |
| PATCH  | /transactions/:id        | Editar movimiento        |
| PATCH  | /transactions/:id/cancel | Anular (soft delete UI)  |
| DELETE | /transactions/:id        | Eliminar (admin only)    |

### Filtros de /transactions
- `workspaceId` (requerido)
- `from`, `to` (YYYY-MM-DD)
- `type` (INCOME | EXPENSE)
- `categoryId`, `accountId`
- `status` (PENDING | COMPLETED | CANCELLED)
- `q` (búsqueda en description, notes, reference)

## Dashboard
| Method | Path                           | Descripción              |
|--------|--------------------------------|--------------------------|
| GET    | /dashboard/summary             | KPIs principales (?workspaceId=&from=&to=) |
| GET    | /dashboard/cash-flow           | Flujo mensual (?workspaceId=&year=) |
| GET    | /dashboard/expense-distribution| Distribución por categoría |

## Health
| Method | Path       | Descripción  |
|--------|------------|--------------|
| GET    | /api/health | Status check |
