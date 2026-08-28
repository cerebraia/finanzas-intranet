# Guía de Rollback — Finanzas Intranet

## Frontend (instantáneo)

Los releases se guardan en `/var/www/finanzas-intranet/releases/`. El rollback es cambiar el symlink `current`:

```bash
# Listar releases disponibles
ls -lt /var/www/finanzas-intranet/releases/

# Volver al release anterior
PREVIOUS=$(ls -dt /var/www/finanzas-intranet/releases/*/ | sed -n '2p')
sudo ln -sfn "$PREVIOUS" /var/www/finanzas-intranet/current
sudo nginx -t && sudo systemctl reload nginx
echo "Rollback a: $PREVIOUS"
```

El cambio es atómico (symlink) — sin downtime.

---

## Base de datos (NO rollback automático)

Las migraciones de Supabase **no se revierten automáticamente** con el rollback del frontend. Las migraciones son aditivas:

- `ALTER TABLE ... ADD COLUMN` → el rollback frontend no borra la columna
- `CREATE TABLE` → la tabla permanece
- `CREATE OR REPLACE FUNCTION` → la función permanece con la versión nueva

Para revertir una migración de DB:
1. Crear una migración nueva que deshaga los cambios (e.g., `DROP COLUMN`, `DROP TABLE`)
2. Aplicar via `supabase db push`
3. **NUNCA** modificar una migración ya aplicada remotamente

---

## Regla general

| Problema | Acción |
|---|---|
| Bug visual / UI | Rollback frontend (symlink) |
| Bug en RPC financiera | Nueva migración correctiva |
| Datos corruptos | Restaurar backup Supabase |
| Schema roto | Nueva migración + posible restauración |

---

## Verificación post-rollback

```bash
curl -I https://TU_DOMINIO        # Debe devolver 200
curl https://TU_DOMINIO/login     # Debe devolver HTML de la app
```
