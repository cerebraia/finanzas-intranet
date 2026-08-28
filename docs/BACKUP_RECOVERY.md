# Backup y Recovery — Finanzas Intranet

## Supabase backups automáticos

Supabase Pro/Team incluye backups automáticos diarios. Plan Free tiene backups manuales.

Verificar en: **Supabase Dashboard → Project Settings → Backups**

---

## Backup manual antes de migraciones sensibles

```bash
# Opción 1: Supabase CLI (requiere PAT con permisos)
supabase db dump --linked -f backup_$(date +%Y%m%d).sql

# Opción 2: pg_dump desde conexión directa
# Obtener connection string en: Supabase Dashboard → Project Settings → Database
pg_dump "postgresql://postgres:PASSWORD@db.XXXXXXXXXX.supabase.co:5432/postgres" \
  --no-owner --no-acl \
  -f backup_$(date +%Y%m%d).sql
```

Guardar el backup en lugar seguro (no en el repositorio).

---

## Checklist antes de una migración de DB

```
[ ] Backup manual creado y verificado
[ ] Migración revisada línea por línea
[ ] No hay DROP TABLE / DROP COLUMN sin respaldo
[ ] No hay cambios destructivos de tipos
[ ] Probada en schema local/staging primero
[ ] Comunicado a usuarios activos si aplica
[ ] supabase db push ejecutado
[ ] Migration list local == remote
[ ] TypeScript regenerado: supabase gen types typescript --linked > src/types/database.types.ts
[ ] Build: npm run build
[ ] Smoke test en producción
```

---

## Restaurar desde backup

```bash
# Solo disponible en Supabase Pro/Team via dashboard
# O usando pg_restore con el archivo .sql:
psql "postgresql://postgres:PASSWORD@db.XXXXXXXXXX.supabase.co:5432/postgres" \
  < backup_YYYYMMDD.sql
```

**ADVERTENCIA**: La restauración sobreescribe datos actuales. Hacer backup del estado actual antes de restaurar.

---

## Qué NO guardar solo localmente

- Registros financieros → solo en Supabase (con backups)
- Migraciones SQL → en el repositorio Git, también aplicadas a Supabase remoto
- Configuración Nginx → documentada en `nginx/finanzas-intranet.conf`
- Variables de entorno → en el VPS en `.env.production` (NO en Git)

---

## Logs de Nginx

```bash
# Acceso
sudo tail -f /var/log/nginx/finanzas-intranet.access.log

# Errores
sudo tail -f /var/log/nginx/finanzas-intranet.error.log

# Rotación automática: gestionada por logrotate
sudo cat /etc/logrotate.d/nginx
```

---

## Logs de Supabase

- **Auth**: Supabase Dashboard → Logs → Auth
- **Database**: Supabase Dashboard → Logs → Database / Postgres
- **API**: Supabase Dashboard → Logs → API
- **Edge Functions**: Supabase Dashboard → Logs → Edge Functions
