# Production Readiness Checklist

Estado: **EN PREPARACIÓN** — El proyecto está listo para desarrollo local. Este checklist cubre lo necesario para llevar la aplicación a un VPS en producción.

---

## 1. Base de datos

- [ ] Instalar PostgreSQL en VPS (o usar servicio gestionado: Supabase, Neon, Railway)
- [ ] Configurar `DATABASE_URL` en `.env` de producción
- [ ] Ejecutar `npx prisma migrate deploy`
- [ ] Ejecutar seed inicial con datos de producción
- [ ] Configurar backups automáticos de DB (cron + pg_dump o herramienta del proveedor)
- [ ] Revisar reglas de acceso (pg_hba.conf / firewall) — solo permitir conexión desde el servidor

---

## 2. Docker (recomendado)

```dockerfile
# Estructura sugerida
services:
  app:
    build: .
    environment:
      - DATABASE_URL=...
      - JWT_SECRET=...
      - PORT=3001
    ports:
      - "3001:3001"
  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
```

- [ ] Crear `Dockerfile` para el servidor Express
- [ ] Crear `docker-compose.yml` con app + postgres
- [ ] Agregar `.dockerignore`
- [ ] Probar `docker compose up` localmente antes del deploy

---

## 3. Nginx (reverse proxy)

```nginx
server {
    listen 80;
    server_name tudominio.com;

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /var/www/finanzas/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] Instalar Nginx en VPS
- [ ] Configurar server block para el dominio
- [ ] Habilitar gzip para assets estáticos
- [ ] Configurar cabeceras de seguridad (X-Frame-Options, CSP, etc.)

---

## 4. SSL / HTTPS

- [ ] Apuntar dominio al IP del VPS (DNS)
- [ ] Instalar Certbot: `sudo apt install certbot python3-certbot-nginx`
- [ ] Obtener certificado: `sudo certbot --nginx -d tudominio.com`
- [ ] Configurar renovación automática (cron `certbot renew`)

---

## 5. Variables de entorno

Revisar `.env.example` y configurar en producción:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/finanzas
JWT_SECRET=<secreto-aleatorio-largo>
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://tudominio.com
```

- [ ] Nunca commitear `.env` con valores reales
- [ ] Usar variables de entorno del VPS (no archivos .env en producción)
- [ ] Rotar `JWT_SECRET` al hacer deploy inicial

---

## 6. Build del frontend

```bash
npm run build
# Subir dist/ al servidor o configurar CI/CD
```

- [ ] Ejecutar `npm run build` sin errores TypeScript
- [ ] Verificar que el build genera `dist/index.html` correcto
- [ ] Copiar `dist/` a la ruta de Nginx o servir desde Express (en modo fallback)
- [ ] Verificar PWA: manifest.json, service worker, íconos

---

## 7. Proceso del servidor (PM2)

```bash
npm install -g pm2
pm2 start dist/server/index.js --name finanzas-api
pm2 startup
pm2 save
```

- [ ] Instalar PM2 globalmente
- [ ] Configurar proceso para auto-restart
- [ ] Agregar monitoreo de logs: `pm2 logs finanzas-api`

---

## 8. Logging y monitoreo

- [ ] Agregar logger estructurado al servidor Express (Winston o Pino)
- [ ] Configurar niveles: error, warn, info en producción
- [ ] Nunca loguear contraseñas, tokens ni datos sensibles
- [ ] Considerar servicio externo (Logtail, Papertrail) para logs centralizados
- [ ] Configurar alertas básicas de CPU/memoria en el VPS

---

## 9. Seguridad básica

- [ ] Rate limiting en rutas de auth (`/api/auth/login`)
- [ ] Helmet.js en Express para cabeceras HTTP de seguridad
- [ ] CORS configurado solo para el dominio de producción
- [ ] JWT en cookies HttpOnly (no localStorage) para producción
- [ ] Validar todos los inputs con Zod en el servidor (ya implementado)
- [ ] Deshabilitar `X-Powered-By: Express`
- [ ] Revisión de roles: nunca confiar en permisos del frontend solamente

---

## 10. Respaldos

- [ ] Cron diario de pg_dump a directorio seguro
- [ ] Script de backup externo (S3, Backblaze, etc.)
- [ ] Probar restauración de backup antes del go-live
- [ ] Documentar proceso de restauración

---

## 11. Pre-deploy final

- [ ] `npm run build` pasa sin errores
- [ ] TypeScript sin errores (`tsc --noEmit`)
- [ ] Tests del servidor pasan (`npm test`)
- [ ] Variables de entorno configuradas
- [ ] Migraciones ejecutadas en DB de producción
- [ ] DNS apuntando al servidor
- [ ] SSL habilitado
- [ ] PM2 corriendo y configurado como servicio del sistema
- [ ] Nginx configurado y activo
- [ ] Primer login de prueba funciona
