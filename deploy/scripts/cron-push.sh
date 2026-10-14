#!/bin/bash
# =====================================================
# Dispara el envío de notificaciones push programadas.
# Pensado para un crontab cada 1 minuto:
#   * * * * * /opt/ipstream-panel/deploy/scripts/cron-push.sh >/dev/null 2>&1
# Ver README.md -> "Envío de notificaciones programadas (Cron)".
# =====================================================
set -u

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env"

read_env() {
  local line
  [[ -f "$ENV_FILE" ]] || return 0
  line="$(grep -E "^$1=" "$ENV_FILE" 2>/dev/null | tail -1 || true)"
  [[ -n "$line" ]] || return 0
  printf '%s' "${line#*=}" | sed -e 's/^"//' -e 's/"$//'
}

CRON_SECRET="${CRON_SECRET:-$(read_env CRON_SECRET)}"
STREAM_DOMAIN="${STREAM_DOMAIN:-$(read_env STREAM_DOMAIN)}"
PANEL_PUBLIC_URL="${PANEL_PUBLIC_URL:-$(read_env PANEL_PUBLIC_URL)}"

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "cron-push: CRON_SECRET no está definido (.env)" >&2
  exit 1
fi

BASE_URL="${PANEL_PUBLIC_URL:-https://${STREAM_DOMAIN:-panelipstream.cl}}"

curl -fsS -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${BASE_URL}/api/cron/send-pending-notifications" >/dev/null
