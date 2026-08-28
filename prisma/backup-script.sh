#!/bin/bash
# db:backup — Crea un backup de PostgreSQL
# Uso: ./prisma/backup-script.sh

set -e

# Cargar variables de .env si existe
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
BACKUP_FILE="${BACKUP_DIR}/finanzas_${TIMESTAMP}.sql"

mkdir -p "$BACKUP_DIR"

# Extraer credenciales del DATABASE_URL
# postgresql://USER:PASSWORD@HOST:PORT/DBNAME
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL no está configurado"
  exit 1
fi

echo "📦 Creando backup: $BACKUP_FILE"
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

echo "✅ Backup completado: $BACKUP_FILE"
echo "   Tamaño: $(du -sh "$BACKUP_FILE" | cut -f1)"
