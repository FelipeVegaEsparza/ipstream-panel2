#!/bin/bash
# =====================================================
# Icecast entrypoint
# - Sustituye variables de entorno en el XML con envsubst
# - Arranca icecast2 con la config resultante
# =====================================================

set -e

CONFIG="/etc/icecast2/icecast.xml"

# Defaults si no se pasan las env vars
export ICE_ADMIN_USER="${ICE_ADMIN_USER:-admin}"
export ICE_ADMIN_PASSWORD="${ICE_ADMIN_PASSWORD:-hackme}"
export ICE_SOURCE_PASSWORD="${ICE_SOURCE_PASSWORD:-hackme}"
export ICE_RELAY_PASSWORD="${ICE_RELAY_PASSWORD:-hackme}"
export ICE_HOSTNAME="${ICE_HOSTNAME:-localhost}"

echo "[icecast] admin user: ${ICE_ADMIN_USER}"
echo "[icecast] hostname:   ${ICE_HOSTNAME}"
echo "[icecast] source pwd: configured"

# Renderizar el template con envsubst
# -i: in-place, pero como el archivo está en la imagen, podemos escribirlo.
# Usamos un archivo temporal y luego mv para evitar problemas de rename.
TMP_CONFIG=$(mktemp)
envsubst < "${CONFIG}" > "${TMP_CONFIG}"
mv "${TMP_CONFIG}" "${CONFIG}"

echo "[icecast] Config renderizada. Arrancando icecast2..."
exec "$@"
