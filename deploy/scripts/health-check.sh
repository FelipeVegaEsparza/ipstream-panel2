#!/bin/bash
# =====================================================
# IPStream Panel — health-check.sh
# =====================================================
# Verifica que todos los servicios estén corriendo y respondiendo.
# Útil para agregar a cron o como health check externo.
#
# Uso:
#   ./health-check.sh
#   ./health-check.sh --quiet   (solo exit code, sin output)
# =====================================================

set -uo pipefail

QUIET=false
if [[ "${1:-}" == "--quiet" ]]; then
  QUIET=true
fi

log() {
  if [[ "$QUIET" == false ]]; then
    echo "$@"
  fi
}

ERRORS=0

# === 1. Containers corriendo ===
log "=== Containers ==="
for svc in ipstream-db ipstream-app ipstream-icecast ipstream-liquidsoap ipstream-streaming-agent ipstream-caddy ipstream-srs ipstream-video-encoder; do
  STATUS=$(docker inspect --format='{{.State.Status}}' "$svc" 2>/dev/null || echo "not_found")
  HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$svc" 2>/dev/null || echo "n/a")
  if [[ "$STATUS" == "running" ]]; then
    log "  ✓ $svc: running ($HEALTH)"
  else
    log "  ✗ $svc: $STATUS"
    ERRORS=$((ERRORS + 1))
  fi
done

# === 2. Health endpoint del panel ===
log
log "=== Health endpoint ==="
HEALTH=$(curl -sf http://localhost:3000/api/health 2>&1)
if [[ -n "$HEALTH" ]]; then
  log "  ✓ Panel health: $HEALTH"
else
  log "  ✗ Panel health: NO RESPONDE"
  ERRORS=$((ERRORS + 1))
fi

# === 3. Icecast respondiendo ===
log
log "=== Icecast ==="
ICECAST=$(curl -sf http://localhost:8000/status-json.xsl 2>&1)
if [[ "$ICECAST" == *"icestats"* ]]; then
  log "  ✓ Icecast status OK"
else
  log "  ✗ Icecast: NO RESPONDE"
  ERRORS=$((ERRORS + 1))
fi

# === 4. Agent health ===
log
log "=== Streaming Agent ==="
AGENT=$(curl -sf http://localhost:4000/health 2>&1)
if [[ -n "$AGENT" ]]; then
  log "  ✓ Agent health: $AGENT"
else
  log "  ✗ Agent: NO RESPONDE"
  ERRORS=$((ERRORS + 1))
fi

# === 5. SRS ===
log
log "=== SRS (Televisión) ==="
SRS=$(curl -sf http://localhost:8080/api/v1/versions 2>&1)
if [[ -n "$SRS" ]]; then
  log "  ✓ SRS: OK"
else
  log "  ✗ SRS: NO RESPONDE"
  ERRORS=$((ERRORS + 1))
fi

# === 6. Caddy ===
log
log "=== Caddy (HTTPS) ==="
CADDY=$(docker inspect --format='{{.State.Health.Status}}' ipstream-caddy 2>/dev/null || echo "n/a")
if [[ "$CADDY" == "healthy" ]]; then
  log "  ✓ Caddy: healthy"
else
  log "  ⚠ Caddy: $CADDY (puede ser que aún no se configuró el dominio)"
fi

# === Resumen ===
log
if [[ $ERRORS -eq 0 ]]; then
  log "✅ Todo OK"
  exit 0
else
  log "❌ $ERRORS servicios con problemas"
  exit 1
fi
