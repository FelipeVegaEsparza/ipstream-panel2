#!/bin/bash
# =====================================================
# Liquidsoap entrypoint
# - Para Fase 0: ejecuta el script que se le pasa como argumento
#   (típicamente test.liq).
# - En fases siguientes será supervisado por el streaming-agent
#   que generará /etc/liquidsoap/scripts/<clientId>.liq
#   y los ejecutará vía docker exec o telnet.
# =====================================================

set -e

SCRIPT_NAME="${1:-test.liq}"
SCRIPT_PATH="/etc/liquidsoap/scripts/${SCRIPT_NAME}"

echo "[liquidsoap] entrypoint: arrancando ${SCRIPT_PATH}"

if [ ! -f "${SCRIPT_PATH}" ]; then
    echo "[liquidsoap] ERROR: no se encontró el script ${SCRIPT_PATH}"
    ls -la /etc/liquidsoap/scripts/ || true
    exit 1
fi

# Habilitar telnet en 0.0.0.0:1234 (lo usaremos para control remoto)
# Nota: en liquidsoap 2.x esto se hace dentro del script con
# set("server.telnet", true) y set("server.telnet.port", 1234).
# Aquí sólo lanzamos el script.

exec liquidsoap "${SCRIPT_PATH}"
