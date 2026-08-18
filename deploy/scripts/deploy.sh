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
# GITHUB_REPOSITORY_OWNER se lee del env (que viene de GH Actions o del .env).
# Si no esta definido, NO usamos 'ipstream' como default porque ese namespace
# no existe (causa pull denied). exigir el valor o fallar.
GITHUB_REPOSITORY_OWNER="${GITHUB_REPOSITORY_OWNER:-}"
if [[ -z "$GITHUB_REPOSITORY_OWNER" ]]; then
  echo "⚠️  GITHUB_REPOSITORY_OWNER no definido. Buscando en .env..."
  if [[ -f .env ]]; then
    GITHUB_REPOSITORY_OWNER=$(grep '^GITHUB_REPOSITORY_OWNER=' .env | cut -d= -f2- || true)
  fi
fi
if [[ -z "$GITHUB_REPOSITORY_OWNER" ]]; then
  echo "❌ ERROR: GITHUB_REPOSITORY_OWNER es requerido para que docker compose"
  echo "         pueda hacer pull del registry. Definilo en .env o como env var."
  exit 1
fi
echo "📦 Usando GITHUB_REPOSITORY_OWNER=$GITHUB_REPOSITORY_OWNER"
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
#
# El liquidsoap container corre como uid 100 (no 1001) y también escribe
# en ./data/radio (cover bytes, etc.) y en ./data/logs/liquidsoap.
# Por eso, además del chown al uid del agent, dejamos los dirs legibles-y-
# escribibles para otros (o+rwX). Esto es aceptable porque los containers
# son parte de un sistema privado detrás de Caddy.
echo "🔐  6b/9 — Ajustando permisos de volúmenes bind-mount..."
mkdir -p ./data/radio ./data/logs/liquidsoap ./data/scripts
# Seed inicial de ./data/scripts con los scripts del repo, si está vacío.
# En deploys posteriores, el agent ya habrá escrito los .liq sobre este dir.
if [[ -z "$(ls -A ./data/scripts 2>/dev/null)" ]]; then
  cp -n ./streaming/liquidsoap/scripts/* ./data/scripts/ 2>/dev/null || true
  echo "  ✓ ./data/scripts sembrado desde el repo"
fi

# Agent (uid 1001) escribe los .liq y lee los MP3/covers.
chown -R 1001:1001 ./data/radio 2>/dev/null || true
chmod -R u+rwX,g+rwX,o+rX ./data/radio 2>/dev/null || true
echo "  ✓ ./data/radio → 1001:1001 + world-readable"

# Scripts runtime: agent los escribe (uid 1001), liquidsoap los lee (ro, uid 100).
chown -R 1001:1001 ./data/scripts 2>/dev/null || true
chmod -R u+rwX,g+rwX,o+rX ./data/scripts 2>/dev/null || true
# Forzar modo legible para .liq pre-existentes (versión vieja del agente
# usaba 0o600 que bloquea la lectura por liquidsoap).
find ./data/scripts -name "*.liq" -exec chmod 644 {} + 2>/dev/null || true
echo "  ✓ ./data/scripts → 1001:1001 + world-readable (.liq = 644)"

# Liquidsoap (uid 100, gid 101) escribe sus logs aquí. Si el agente
# (uid 1001) creó el directorio antes, liquidsoap no puede escribir.
chown -R 100:101 ./data/logs/liquidsoap 2>/dev/null || true
chmod -R u+rwX,g+rwX,o+rwX ./data/logs/liquidsoap 2>/dev/null || true
echo "  ✓ ./data/logs/liquidsoap → 100:101 (g+w o+w)"

# === 8. Prisma db push ANTES de levantar containers ===
# El agente arranca crons (stats/history/retention) que consultan tablas
# (radio_streams, tracks, playlists, play_history). Si lo levantamos antes
# de prisma db push, esos crons fallan en cada primer arranque con tablas
# inexistentes. Por eso db push va primero.
echo "🗄️  7/9 — Sincronizando esquema Prisma (antes del up)..."
# Levantamos solo el app temporalmente para correr prisma db push.
$COMPOSE_CMD up -d app
docker exec ipstream-app npx prisma db push --accept-data-loss --skip-generate 2>&1 || echo "  ⚠ prisma db push no crítico, continuando..."
# Apagamos el app para que el siguiente up -d lo levante limpio.
docker stop ipstream-app 2>/dev/null || true

# === 9. Up de los containers ===
echo "🚀 8/9 — Levantando containers..."
$COMPOSE_CMD up -d --remove-orphans

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
