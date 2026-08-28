# Variables de Entorno — Finanzas Intranet

## Clasificación

### PUBLIC CLIENT VARIABLES (seguras en el bundle)

Se incorporan al bundle JavaScript durante `npm run build`. Cualquier persona con DevTools puede verlas. **Solo deben ser publishable keys**.

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Anon key (publishable) | `eyJhbGciOiJIUzI1NiIs...` |

**Regla**: Si no empieza con `VITE_`, Vite no la incluye en el bundle. Si empieza con `VITE_`, es pública.

### SERVER SECRETS (nunca en el bundle frontend)

Solo para el servidor Express legacy. No requeridas para producción frontend-only.

| Variable | Descripción | Riesgo si expuesta |
|---|---|---|
| `DATABASE_URL` | Conexión directa a PostgreSQL | Acceso completo a DB |
| `JWT_SECRET` | Firma de tokens JWT de Express | Suplantación de identidad |

### CLI SECRETS (solo local, nunca en repositorio)

| Variable | Descripción |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | PAT para Supabase CLI — usar `supabase login` |

---

## Archivos por entorno

| Archivo | Entorno | En Git | Descripción |
|---|---|---|---|
| `.env.example` | Plantilla | ✅ Sí | Solo nombres de variables, sin valores |
| `.env.local` | Desarrollo | ❌ No | Variables locales de desarrollo |
| `.env.production` | Producción | ❌ No | Variables del VPS (crear manualmente en servidor) |
| `.env` | General | ❌ No | Variables compartidas (no recomendado) |

**Prioridad Vite**: `.env.local` > `.env.[mode]` > `.env`

---

## Verificar que no hay secretos en el bundle

```bash
npm run build
# Buscar en dist/ — NO debe aparecer ningún secreto administrativo:
grep -r "service_role\|sbp_\|postgres://" dist/ && echo "PELIGRO: secreto en bundle" || echo "OK: sin secretos administrativos"
# La ANON_KEY sí puede aparecer — es pública por diseño
```

---

## Producción vs Desarrollo

```
localhost:5173  →  lee .env.local  →  Supabase proyecto desarrollo/mismo
TU_DOMINIO      →  lee .env.production (en VPS)  →  Supabase proyecto producción
```

**Importante**: Ambos pueden apuntar al mismo proyecto Supabase para V1. Si en el futuro se separan, actualizar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env.production` del VPS.
