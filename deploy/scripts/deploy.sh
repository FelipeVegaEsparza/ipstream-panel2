#!/bin/bash
# =====================================================
# IPStream Panel — deploy.sh
# =====================================================
# Script idempotente. Puede correrse múltiples veces sin efecto.
# Llamado desde GitHub Actions via SSH después de push a main.
#
# Uso manual (en el VPS):
#   ./deploy.sh [IMAGE_TAG]
#   IMAGE_TAG por defecto: "latest"
# =====================================================

set -euo pipefail

# === Config ===
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
cd "$PROJECT_DIR"

# IMAGE_TAG: argumento o env var, default "latest"
IMAGE_TAG="${1:-${IMAGE_TAG:-latest}}"
GITHUB_REPOSITORY_OWNER="${GITHUB_REPOSITORY_OWNER:-ipstream}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-ipstream-sonicpanel}"
COMPOSE_FILES="-f docker-compose.yml -f deploy/docker-compose.prod.yml"
COMPOSE_CMD="docker compose --project-name ${COMPOSE_PROJECT_NAME} ${COMPOSE_FILES}"

# Verificamos que .env existe
if [[ ! -f .env ]]; then
  echo "❌ ERROR: .env no existe. Copiá deploy/.env.prod.example a .env y completá los secretos."
  exit 1
fi

# Cargamos .env en el environment
set -a
source .env
set +a

# Verificamos variables críticas
for var in STREAM_DOMAIN MYSQL_USER MYSQL_PASSWORD NEXTAUTH_SECRET ENCRYPTION_KEY STREAMING_AGENT_TOKEN; do
  if [[ -z "${!var:-}" ]]; then
    echo "❌ ERROR: variable $var no está definida en .env"
    exit 1
  fi
done

echo "=================================================="
echo "  IPStream Panel — Deploy"
echo "=================================================="
echo "  Project dir:   $PROJECT_DIR"
echo "  Image tag:     $IMAGE_TAG"
echo "  GitHub owner:  $GITHUB_REPOSITORY_OWNER"
echo "  Domain:        $STREAM_DOMAIN"
echo "=================================================="
echo

# === 1. Pull del código ===
echo "📥 1/9 — Pull del código..."
git fetch origin main
git reset --hard origin/main

# === 2. Export IMAGE_TAG para que el compose lo use ===
export IMAGE_TAG
export GITHUB_REPOSITORY_OWNER

# === 3. Pull de la imagen nueva ===
echo "🐳 2/9 — Pull de la imagen ghcr.io/${GITHUB_REPOSITORY_OWNER}/ipstream-panel:${IMAGE_TAG}..."
$COMPOSE_CMD pull app || {
  echo "⚠️  No se pudo pull la imagen. Verificá que el build haya terminado en GitHub Actions."
  echo "    Si es el primer deploy, es posible que la imagen no exista todavía."
  echo "    Continuando con build local como fallback..."
  $COMPOSE_CMD build app
}

# === 4. Construir servicios locales (agente, icecast, liquidsoap) ===
echo "🔨 3/9 — Construyendo servicios locales (agente, icecast, liquidsoap)..."
$COMPOSE_CMD build agent icecast liquidsoap

# === 5. Esperar a que la DB esté healthy (DB container sigue corriendo) ===
echo "⏳ 4/9 — Esperando a que MySQL esté healthy..."
TIMEOUT=60
ELAPSED=0
until docker inspect --format='{{.State.Health.Status}}' ipstream-db 2>/dev/null | grep -q healthy; do
  if [[ $ELAPSED -ge $TIMEOUT ]]; then
    echo "❌ MySQL no quedó healthy en ${TIMEOUT}s"
    exit 1
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done
echo "  ✓ MySQL healthy en ${ELAPSED}s"

# === 6. Migraciones PRIMERO — antes de iniciar nuevos containers ===
#    Necesitamos que la columna coverUrl exista antes de que el agente empiece.
echo "🗄️  5/9 — Aplicando migraciones Prisma..."
docker run --rm \
  --network container:ipstream-db \
  --entrypoint npx \
  -e DATABASE_URL="mysql://${MYSQL_USER}:${MYSQL_PASSWORD}@localhost:3306/${MYSQL_DATABASE}" \
  "ghcr.io/${GITHUB_REPOSITORY_OWNER}/ipstream-panel:${IMAGE_TAG}" \
  prisma db push --accept-data-loss --skip-generate

# === 7. Up de los containers ===
echo "🚀 6/9 — Levantando containers..."
$COMPOSE_CMD up -d --remove-orphans

# === 8. Health check ===
echo "🏥 7/8 — Verificando health (esperando hasta 30s)..."
TIMEOUT=30
ELAPSED=0
while true; do
  HEALTH=$(curl -sf http://localhost:3000/api/health 2>/dev/null || echo "FAIL")
  if [[ "$HEALTH" != "FAIL" ]]; then
    echo "  ✓ Health OK: $HEALTH"
    break
  fi
  if [[ $ELAPSED -ge $TIMEOUT ]]; then
    echo "❌ Health check falló después de ${TIMEOUT}s"
    echo "   docker logs --tail 50 ipstream-app"
    docker logs --tail 50 ipstream-app 2>/dev/null || true
    exit 1
  fi
  sleep 3
  ELAPSED=$((ELAPSED + 3))
done

echo
echo "=================================================="
echo "  ✅ Deploy exitoso"
echo "=================================================="
echo "  Panel:   https://${STREAM_DOMAIN}"
echo "  Stream:  ${ICE_PUBLIC_URL}"
echo
echo "  Para ver logs:"
echo "    docker compose ${COMPOSE_FILES#-f } logs -f app"
echo "=================================================="
