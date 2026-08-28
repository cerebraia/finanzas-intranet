#!/bin/bash
# deploy.sh — Script de despliegue para finanzas-intranet
# Ejecutar en el VPS como usuario 'deploy'
# Uso: ./scripts/deploy.sh [--skip-build]

set -euo pipefail

APP_DIR="/var/www/finanzas-intranet"
REPO_DIR="$APP_DIR/repo"
RELEASES_DIR="$APP_DIR/releases"
CURRENT_LINK="$APP_DIR/current"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RELEASE_DIR="$RELEASES_DIR/$TIMESTAMP"
KEEP_RELEASES=5

echo "==> Deploy iniciado: $TIMESTAMP"

# ── 1. Pull última versión ───────────────────────────────────────────────────
echo "==> Actualizando repositorio..."
cd "$REPO_DIR"
git fetch origin
git checkout main
git pull origin main

# ── 2. Instalar dependencias ─────────────────────────────────────────────────
echo "==> Instalando dependencias..."
npm ci --prefer-offline

# ── 3. Build de producción ───────────────────────────────────────────────────
# Las variables VITE_* deben estar en .env.production en el directorio del repo
echo "==> Construyendo bundle de producción..."
npm run build

# ── 4. Crear directorio de release ──────────────────────────────────────────
echo "==> Creando release $TIMESTAMP..."
mkdir -p "$RELEASE_DIR"
cp -r dist/. "$RELEASE_DIR/"

# ── 5. Cambiar symlink atómicamente ─────────────────────────────────────────
echo "==> Activando nueva versión..."
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

# ── 6. Verificar Nginx y recargar ────────────────────────────────────────────
echo "==> Recargando Nginx..."
sudo nginx -t
sudo systemctl reload nginx

# ── 7. Limpiar releases antiguos ────────────────────────────────────────────
echo "==> Limpiando releases antiguos (conservando últimos $KEEP_RELEASES)..."
ls -dt "$RELEASES_DIR"/*/  | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf

echo "==> Deploy completado: $CURRENT_LINK → $RELEASE_DIR"
echo "==> Smoke check: curl -I https://TU_DOMINIO"
