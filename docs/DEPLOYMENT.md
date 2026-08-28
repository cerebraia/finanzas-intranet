# Guía de Despliegue — Finanzas Intranet

## Arquitectura

```
Internet → HTTPS → Nginx (VPS) → dist/ estático → Supabase Cloud
```

El backend de datos vive en Supabase (PostgreSQL + Auth + RLS). El VPS sirve únicamente el bundle estático de React/Vite. **No se necesita Node.js ejecutándose permanentemente en el VPS.**

---

## Pre-requisitos del VPS

- Ubuntu 22.04 LTS
- Nginx: `sudo apt install nginx`
- Certbot: `sudo apt install certbot python3-certbot-nginx`
- Git: `sudo apt install git`
- Node.js 20+: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install nodejs`

---

## Estructura de directorios en VPS

```
/var/www/finanzas-intranet/
├── repo/          # Repositorio git clonado
├── releases/      # Builds históricos (últimos 5)
│   ├── 20260818-120000/
│   └── 20260820-093000/
└── current -> releases/20260820-093000/   # Symlink activo (Nginx apunta aquí)
```

---

## Setup inicial (solo la primera vez)

### 1. Crear usuario deploy

```bash
sudo adduser deploy
# Permitir recargar Nginx sin contraseña:
echo "deploy ALL=(ALL) NOPASSWD: /usr/sbin/nginx, /bin/systemctl reload nginx, /bin/systemctl restart nginx" | sudo tee /etc/sudoers.d/deploy-nginx
```

### 2. Clonar repositorio

```bash
sudo mkdir -p /var/www/finanzas-intranet/{repo,releases}
sudo chown -R deploy:deploy /var/www/finanzas-intranet
su - deploy
cd /var/www/finanzas-intranet
git clone git@github.com:TU_USUARIO/finanzas-intranet.git repo
```

Si el repo es privado, configurar una SSH deploy key:
```bash
ssh-keygen -t ed25519 -C "deploy@VPS" -f ~/.ssh/deploy_key
# Copiar ~/.ssh/deploy_key.pub como Deploy Key en GitHub (solo lectura)
```

### 3. Crear .env.production en el VPS

```bash
cp /var/www/finanzas-intranet/repo/.env.example /var/www/finanzas-intranet/repo/.env.production
nano /var/www/finanzas-intranet/repo/.env.production
```

Contenido mínimo requerido:
```env
VITE_SUPABASE_URL=https://XXXXXXXXXX.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

⚠️ Las variables `VITE_*` se leen durante `npm run build`. Este archivo debe existir ANTES del build.

### 4. Primer build y deploy

```bash
cd /var/www/finanzas-intranet/repo
npm ci
npm run build
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p /var/www/finanzas-intranet/releases/$TIMESTAMP
cp -r dist/. /var/www/finanzas-intranet/releases/$TIMESTAMP/
ln -sfn /var/www/finanzas-intranet/releases/$TIMESTAMP /var/www/finanzas-intranet/current
```

### 5. Configurar Nginx

```bash
sudo cp /var/www/finanzas-intranet/repo/nginx/finanzas-intranet.conf /etc/nginx/sites-available/finanzas-intranet
# Reemplazar TU_DOMINIO con el dominio real:
sudo sed -i 's/TU_DOMINIO/finanzas.tudominio.com/g' /etc/nginx/sites-available/finanzas-intranet
sudo ln -s /etc/nginx/sites-available/finanzas-intranet /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 6. DNS

Crear registro A en tu proveedor DNS:
```
Tipo: A
Host: finanzas (o @)
Valor: IP_DEL_VPS
TTL: 300
```

Verificar: `dig finanzas.tudominio.com` — debe resolver a la IP del VPS.

### 7. SSL con Certbot

```bash
# Esperar a que DNS resuelva (~5–30 min), luego:
sudo certbot --nginx -d finanzas.tudominio.com
# Certbot actualiza la config Nginx automáticamente
sudo nginx -t && sudo systemctl reload nginx
```

### 8. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 9. Configurar Supabase Auth URLs

En Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://finanzas.tudominio.com`
- **Redirect URLs**:
  - `https://finanzas.tudominio.com/**`
  - `http://localhost:5173/**` (mantener para desarrollo)

---

## Deploys posteriores

```bash
bash /var/www/finanzas-intranet/repo/scripts/deploy.sh
```

---

## Express legacy (Import page)

El módulo `/import` depende de Express. Para V1 frontend-only, esta función **no está disponible en producción**. Opciones futuras:
1. Migrar a Supabase Edge Functions (recomendado)
2. Desplegar Express con PM2 en el mismo VPS

---

## Smoke test post-deploy

```bash
curl -I https://finanzas.tudominio.com          # 200 OK
curl -sL https://finanzas.tudominio.com | grep "Finanzas"   # HTML correcto
```
