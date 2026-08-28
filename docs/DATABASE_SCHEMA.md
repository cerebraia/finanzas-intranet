# Database Schema

## Tablas

### Workspace
| Campo     | Tipo         | Descripción              |
|-----------|--------------|--------------------------|
| id        | cuid         | Primary key              |
| name      | String       | Nombre visible           |
| slug      | String UNIQUE| Identificador URL        |
| type      | WorkspaceType| PERSONAL \| BUSINESS     |
| emoji     | String?      | Emoji visual             |
| isActive  | Boolean      | Soft delete              |

### Account
| Campo          | Tipo        | Descripción              |
|----------------|-------------|--------------------------|
| id             | cuid        | Primary key              |
| workspaceId    | FK Workspace| Workspace propietario    |
| name           | String      | Nombre de la cuenta      |
| type           | AccountType | BANK, CASH, ZELLE, etc.  |
| currency       | Currency    | USD, VES, EUR            |
| initialBalance | Decimal(18,2)| Saldo inicial           |
| isActive       | Boolean     | Soft delete              |

**Nota**: El saldo actual se calcula, no se almacena. Ver BUSINESS_RULES.md.

### Category
| Campo       | Tipo         | Descripción              |
|-------------|--------------|--------------------------|
| id          | cuid         | Primary key              |
| workspaceId | FK?          | NULL = categoría global  |
| name        | String       | Nombre                   |
| type        | CategoryType | INCOME \| EXPENSE        |
| icon        | String?      | Emoji icono              |
| color       | String?      | Color hex (#7C3AED)      |

### Transaction
| Campo           | Tipo              | Descripción              |
|-----------------|-------------------|--------------------------|
| id              | cuid              | Primary key              |
| workspaceId     | FK Workspace      | Aislamiento por workspace|
| accountId       | FK Account        | Cuenta asociada          |
| categoryId      | FK Category       | Categoría                |
| type            | TransactionType   | INCOME \| EXPENSE        |
| amount          | Decimal(18,2)     | Nunca float para dinero  |
| description     | String            | Descripción requerida    |
| transactionDate | Date              | Fecha del movimiento     |
| status          | TransactionStatus | PENDING/COMPLETED/CANCELLED |
| notes           | String?           | Notas opcionales         |
| reference       | String?           | Referencia externa       |

### Transfer
Reservado para hito futuro (transferencias entre cuentas).
No crea Transaction de tipo INCOME/EXPENSE.

## Índices
- `Transaction(workspaceId, transactionDate)` — filtros de dashboard
- `Transaction(workspaceId, type, status)` — totales por tipo
- `Transaction(accountId, status)` — saldo por cuenta
