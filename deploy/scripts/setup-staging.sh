#!/bin/bash
# =====================================================
# CasterFly — Staging: genera .env.staging
# =====================================================
# Crea un .env.staging con secretos aleatorios la primera vez. Si el archivo
# ya existe NO lo toca (idempotente).
#
# Uso:
#   bash deploy/scripts/setup-staging.sh [ruta]
#
# El archivo queda con permisos 600 y está cubierto por .gitignore.
# =====================================================

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FILE="${1:-$ROOT/.env.staging}"

if [[ -f "$FILE" ]]; then
  echo "✓ Ya existe $FILE — no se modifica."
  exit 0
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "❌ Falta openssl." >&2
  exit 1
fi

rand_hex() { openssl rand -hex "${1:-32}"; }
ADMIN_PASS="$(openssl rand -base64 24 | tr -d '/+=' | tr -d '\n' | cut -c1-16)"

umask 077
cat > "$FILE" <<EOF
# Staging de CasterFly — generado por deploy/scripts/setup-staging.sh.
# NO commitear (cubierto por .gitignore). Regenerar solo si se descarta la DB.
MYSQL_ROOT_PASSWORD=$(rand_hex 16)
MYSQL_USER=ipstream
MYSQL_PASSWORD=$(rand_hex 16)
MYSQL_DATABASE=ipstream_staging
NEXTAUTH_SECRET=$(openssl rand -base64 32 | tr -d '\n')
ENCRYPTION_KEY=$(rand_hex 32)
CRON_SECRET=$(rand_hex 32)
ADMIN_EMAIL=admin@staging.local
ADMIN_PASSWORD=$ADMIN_PASS
GITHUB_REPOSITORY_OWNER=${GITHUB_REPOSITORY_OWNER:-FelipeVegaEsparza}
IMAGE_TAG=latest
STAGING_URL=http://127.0.0.1:3001
EOF
chmod 600 "$FILE"

echo "✓ Creado $FILE (600)"
echo "  admin: $(grep '^ADMIN_EMAIL=' "$FILE" | cut -d= -f2-) / $(grep '^ADMIN_PASSWORD=' "$FILE" | cut -d= -f2-)"
echo
echo "Levantar:"
echo "  docker compose --env-file $FILE -p ipstream-staging -f docker-compose.staging.yml up -d"
echo "Abrir (desde tu máquina):"
echo "  ssh -L 3001:127.0.0.1:3001 <usuario>@<vps>  →  http://localhost:3001"
