#!/bin/bash
# =====================================================
# Dispara el envío de notificaciones push programadas.
# Pensado para un crontab cada 1 minuto:
#   * * * * * /opt/ipstream-panel/deploy/scripts/cron-push.sh >/dev/null 2>&1
# Ver README.md -> "Envío de notificaciones programadas (Cron)".
# =====================================================
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env"

read_env() {
  [[ -f "$ENV_FILE" ]] || return 0
  grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'
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
