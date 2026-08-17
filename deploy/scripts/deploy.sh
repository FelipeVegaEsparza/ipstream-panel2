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
for var in STREAM_DOMAIN MYSQL_USER MYSQL_PASSWORD MYSQL_DATABASE NEXTAUTH_SECRET ENCRYPTION_KEY STREAMING_AGENT_TOKEN HARBOR_CALLBACK_SECRET ICE_ADMIN_PASSWORD ICE_SOURCE_PASSWORD ICE_RELAY_PASSWORD ICE_HOSTNAME; do
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

# === 2. Export variables ===
export IMAGE_TAG
export GITHUB_REPOSITORY_OWNER

# === 3. Login a GHCR si hay token ===
if [[ -n "${GHCR_TOKEN:-}" ]]; then
  echo "🔑 2/9 — Autenticando Docker en ghcr.io..."
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GITHUB_REPOSITORY_OWNER" --password-stdin
fi

# === 4. Pull de la imagen nueva ===
echo "🐳 3/9 — Pull de la imagen ghcr.io/${GITHUB_REPOSITORY_OWNER}/ipstream-panel:${IMAGE_TAG}..."
$COMPOSE_CMD pull app || {
  echo "⚠️  No se pudo pull la imagen. Verificá que el build haya terminado en GitHub Actions."
  echo "    Si es el primer deploy, es posible que la imagen no exista todavía."
  echo "    Continuando con build local como fallback..."
  $COMPOSE_CMD build app
}

# === 4b. Pull de imagen video-encoder ===
echo "🐳 3b/9 — Pull de la imagen video-encoder..."
$COMPOSE_CMD pull video-encoder || {
  echo "⚠️  No se pudo pull video-encoder. Build local como fallback..."
  $COMPOSE_CMD build video-encoder
}

# === 5. Construir servicios locales (agente, icecast, liquidsoap) ===
echo "🔨 4/9 — Construyendo servicios locales (agente, icecast, liquidsoap)..."
$COMPOSE_CMD build agent icecast liquidsoap

# === 6. Esperar a que la DB esté healthy (DB container sigue corriendo) ===
echo "⏳ 5/9 — Esperando a que MySQL esté healthy..."
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

# === 7. Migración directa de la columna coverUrl (antes de iniciar nuevos containers) ===
#    Necesitamos que la columna exista antes de que el agente empiece.
echo "🗄️  6/9 — Agregando columna coverUrl..."
docker exec ipstream-db mysql -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" "${MYSQL_DATABASE}" \
  -e "ALTER TABLE tracks ADD COLUMN IF NOT EXISTS coverUrl VARCHAR(255) DEFAULT NULL AFTER filePath;" 2>/dev/null && \
  echo "  ✓ columna coverUrl lista" || echo "  - columna ya existía (o no hace falta)"

# === 7b. Asegurar permisos del data dir antes del up ===
# El streaming-agent corre como uid 1001 (streamagent). Si ./data/radio quedó
# propiedad de otro usuario (típico cuando se subió algo desde el host), el
# agent no podrá leer los MP3/covers y devolverá 404 en cada cover/audio.
echo "🔐  6b/9 — Ajustando permisos de volúmenes bind-mount..."
mkdir -p ./data/radio ./data/logs/liquidsoap ./streaming/liquidsoap/scripts

# Agent (uid 1001) escribe los .liq y lee los MP3/covers.
chown -R 1001:1001 ./data/radio 2>/dev/null && echo "  ✓ ./data/radio → 1001:1001" || \
  echo "  ⚠ no se pudo chown ./data/radio. Continuando."

# Agent (uid 1001) genera los .liq aquí. Liquidsoap los lee (ro en su compose).
chown -R 1001:1001 ./streaming/liquidsoap/scripts 2>/dev/null && echo "  ✓ ./streaming/liquidsoap/scripts → 1001:1001" || \
  echo "  ⚠ no se pudo chown ./streaming/liquidsoap/scripts. Continuando."

# Liquidsoap (uid 100, gid 101) escribe sus logs aquí. Antes era named volume
# propiedad de otro uid y moría con "Permission denied" al primer arranque.
chown -R 100:101 ./data/logs/liquidsoap 2>/dev/null && echo "  ✓ ./data/logs/liquidsoap → 100:101" || \
  echo "  ⚠ no se pudo chown ./data/logs/liquidsoap. Continuando."

# === 8. Up de los containers ===
echo "🚀 7/9 — Levantando containers..."
$COMPOSE_CMD up -d --remove-orphans

# === 9. Prisma db push (resto de migraciones, dentro del nuevo container) ===
echo "🗄️  8/9 — Sincronizando esquema Prisma..."
docker exec ipstream-app npx prisma db push --accept-data-loss --skip-generate 2>&1 || echo "  ⚠ prisma db push no crítico, continuando..."

# === 10. Health check ===
echo "🏥 9/9 — Verificando health (esperando hasta 30s)..."
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

# === 11. Limpieza de imágenes viejas y caché ===
echo "🧹 Limpieza — Eliminando imágenes y caché Docker no utilizados..."
docker system prune -f 2>&1 | tail -1

echo
echo "=================================================="
echo "  ✅ Deploy exitoso"
echo "=================================================="
echo "  Panel:     https://${STREAM_DOMAIN}"
echo "  Radio:     ${ICE_PUBLIC_URL}"
echo "  Televisión: rtmp://${STREAM_DOMAIN}:1935/live/{stream_key}"
echo "  HLS:       http://${STREAM_DOMAIN}:8080/live/{stream_key}.m3u8"
echo
echo "  Para ver logs:"
echo "    docker compose ${COMPOSE_FILES#-f } logs -f app"
echo "=================================================="
