# Production Checklist — Finanzas Intranet

## Pre-deploy (local)

- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npm run build` → exitoso
- [ ] Secret scan en `dist/`: ningún secreto administrativo
- [ ] Migraciones locales == remotas (`supabase migration list`)
- [ ] `.env.example` actualizado con nuevas variables
- [ ] Código revisado: no hay `console.log` con datos sensibles

## VPS Setup

- [ ] Usuario `deploy` creado
- [ ] SSH key configurada (no contraseña en GitHub)
- [ ] `.env.production` creado en VPS con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- [ ] Nginx instalado y configurado (`nginx -t` pasa)
- [ ] Certbot instalado

## DNS y SSL

- [ ] Registro A en DNS apunta a IP del VPS
- [ ] `dig DOMINIO` resuelve correctamente
- [ ] Certbot genera certificado SSL
- [ ] HTTPS funciona: `curl -I https://DOMINIO` → 200
- [ ] HTTP redirige a HTTPS: `curl -I http://DOMINIO` → 301

## Supabase

- [ ] Migraciones 021–024 aplicadas remotamente
- [ ] `supabase migration list` — local == remote
- [ ] `database.types.ts` regenerado
- [ ] Site URL configurada en Supabase Auth
- [ ] Redirect URLs incluyen dominio de producción

## Tests funcionales en producción

- [ ] Login funciona
- [ ] Refresh mantiene sesión
- [ ] Logout limpia sesión
- [ ] Login con credenciales incorrectas muestra error
- [ ] Dashboard carga correctamente (no $0 falsos)
- [ ] Accounts muestra balances reales
- [ ] Transactions se registran
- [ ] Clients cargan
- [ ] Receivables cargan y se pueden pagar
- [ ] Payroll carga
- [ ] Debts cargan y se pueden pagar
- [ ] Reports coincide con Dashboard
- [ ] Transfers funcionan (patrimonio no cambia)
- [ ] SPA routing: refrescar en `/debts` → funciona
- [ ] 404 page aparece en ruta no existente
- [ ] Mobile: sidebar/bottom nav funcional
- [ ] Network error: muestra "No pudimos cargar" (no $0)
- [ ] Password reset enviado al email

## Seguridad

- [ ] HTTPS obligatorio (HTTP → 301 → HTTPS)
- [ ] `robots.txt` sirve correctamente
- [ ] `noindex` en HTML
- [ ] No hay fugas de secretos en bundle (`grep -r "service_role" dist/`)
- [ ] Security headers presentes (`curl -I https://DOMINIO | grep X-Frame`)
- [ ] `.env.production` no accesible públicamente
- [ ] `.git/` no accesible públicamente

## Monitoreo

- [ ] Logs Nginx en `/var/log/nginx/finanzas-intranet.*.log`
- [ ] Logrotate configurado para Nginx
- [ ] Uptime monitor opcional (UptimeRobot, BetterUptime, etc.)
- [ ] Supabase logs accesibles en dashboard

## Documentación

- [ ] `docs/DEPLOYMENT.md` actualizado
- [ ] `docs/ROLLBACK.md` disponible
- [ ] `docs/BACKUP_RECOVERY.md` disponible
- [ ] `docs/ENVIRONMENT_VARIABLES.md` actualizado
