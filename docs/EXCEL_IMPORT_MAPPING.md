# Mapeo de importación Excel → Sistema

Este documento define cómo el importador interpreta las columnas del Excel histórico.

## Columnas detectadas automáticamente

| Columna origen | Variantes reconocidas | Entidad destino | Transformación | Observaciones |
|---|---|---|---|---|
| Fecha | `Fecha`, `fecha`, `DATE`, `date`, `Día` | `Transaction.transactionDate` | Parsea DD/MM/YYYY, DD-MM-YYYY, serial Excel | Si no se puede parsear → REVIEW_REQUIRED |
| Descripción | `Descripción`, `Description`, `descripcion`, `Concepto`, `concepto` | `Transaction.description` | String limpio | Si está vacío → REVIEW_REQUIRED |
| Monto | `Monto`, `monto`, `Amount`, `Importe`, `importe`, `Valor` | `Transaction.amount` | Elimina $, comas, espacios. Siempre positivo | Si no es número → REVIEW_REQUIRED |
| Tipo | `Tipo`, `tipo`, `Type` | `Transaction.type` | `ingreso`/`cobro` → INCOME, `gasto`/`pago` → EXPENSE | Si monto negativo → EXPENSE, positivo → INCOME |
| Categoría | `Categoría`, `Categoria`, `categoria`, `Category` | `Transaction.categoryId` | Se usa la categoría por defecto seleccionada al importar | Mapeo futuro por nombre |
| Cuenta | `Cuenta`, `cuenta`, `Account` | `Transaction.accountId` | Se usa la cuenta seleccionada al importar | Mapeo futuro por nombre |
| Referencia | `Referencia`, `referencia`, `Ref` | `Transaction.reference` | String directo | Opcional |

## Estados de cada fila

| Estado | Significado | Acción del sistema |
|---|---|---|
| `OK` | Fila completa y válida | Importar |
| `REVIEW_REQUIRED` | Falta 1-2 campos, pero es recuperable | Importar solo si `skipReview=false` se deshabilita |
| `ERROR` | Faltan >2 campos críticos | No importar |
| `DUPLICATE` | El archivo ya fue procesado (mismo hash SHA-256) | No importar |

## Hoja procesada

El importador procesa **la primera hoja** del archivo Excel.

Para archivos con múltiples hojas, se recomienda consolidar todo en la primera hoja antes de importar.

## Proceso de importación (3 etapas)

### Etapa 1 — Parseo
`POST /api/import/preview`
- Lee el archivo (base64)
- Detecta columnas automáticamente
- Calcula hash SHA-256 del archivo
- Devuelve preview sin escribir nada en DB

### Etapa 2 — Revisión
El usuario revisa el preview en la UI:
- Ve totales (OK, REVIEW_REQUIRED, ERROR)
- Ve las primeras 50 filas
- Selecciona cuenta y categoría por defecto
- Decide si omitir filas con advertencias

### Etapa 3 — Importación
`POST /api/import/execute`
- Crea `ImportBatch` con el hash del archivo
- Importa filas OK (y opcionalmente REVIEW_REQUIRED)
- Marca el batch como COMPLETED/PARTIAL/FAILED
- Si el mismo archivo se importa de nuevo → rechaza (idempotente)

## Idempotencia

Cada archivo se identifica por su hash SHA-256.
Si `ImportBatch.fileHash` ya existe con status `COMPLETED`, el sistema **rechaza** la importación.
Esto evita duplicados aunque el usuario corra el proceso dos veces.

## Ejemplo de archivo compatible

```
Fecha       | Descripción           | Monto  | Tipo    | Categoría     | Referencia
15/01/2026  | Toyo Éxito - Meta Ads | 300    | ingreso | Clientes      | REF-001
16/01/2026  | ChatGPT               | 20     | gasto   | Suscripciones |
17/01/2026  | Leo Aguado nómina     | 400    | gasto   | Nómina        |
```

## Pendiente futuro

- Mapeo automático de categorías por nombre de columna
- Mapeo automático de cuentas por nombre
- Soporte de múltiples hojas
- Detección de nómina por descripción
- Preview de reconciliación vs datos existentes
