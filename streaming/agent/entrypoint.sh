#!/bin/bash
# =====================================================
# IPStream Streaming Agent — entrypoint
# Arranca el agente como usuario no-root, pero primero
# ajusta permisos y el acceso al socket Docker.
# =====================================================

set -e

USER_NAME=streamagent
USER_UID=1001
USER_GID=1001
USER_GROUP=nodejs

# Crear usuario/grupo si no existen (ej: imagen nueva)
if ! getent group "$USER_GROUP" >/dev/null 2>&1; then
    groupadd --system --gid "$USER_GID" "$USER_GROUP"
fi
if ! id -u "$USER_NAME" >/dev/null 2>&1; then
    useradd --system --uid "$USER_UID" --gid "$USER_GROUP" "$USER_NAME"
fi

# Ajustar permisos de directorios que vamos a escribir.
# Si son bind mounts del host, el usuario del host puede no coincidir;
# aquí nos aseguramos de que el usuario del contenedor pueda escribir.
chown -R "$USER_NAME:$USER_GROUP" /app /var/lib/radio /var/log/liquidsoap /etc/liquidsoap/scripts 2>/dev/null || true

# Permitir acceso al socket Docker: detectar el GID del socket montado
# y crear un grupo con ese GID para el usuario del agente.
if [ -S /var/run/docker.sock ]; then
    DOCKER_GID=$(stat -c '%g' /var/run/docker.sock)
    if ! getent group "$DOCKER_GID" >/dev/null 2>&1; then
        groupadd --system --gid "$DOCKER_GID" dockerhost 2>/dev/null || true
    fi
    DOCKER_GROUP=$(getent group "$DOCKER_GID" | cut -d: -f1)
    if [ -n "$DOCKER_GROUP" ]; then
        usermod -aG "$DOCKER_GROUP" "$USER_NAME" 2>/dev/null || true
    fi
fi

# Verificar que las variables críticas no estén con defaults inseguros
WARN=0
for var in STREAMING_AGENT_TOKEN HARBOR_CALLBACK_SECRET ENCRYPTION_KEY; do
    val="${!var:-}"
    if [ -z "$val" ] || \
       [ "$val" = "dev-agent-token-change-me-in-prod" ] || \
       [ "$val" = "dev-harbor-callback-token-change-me" ] || \
       [ "$val" = "CHANGE_ME_genera_con_openssl_rand_-hex_32" ]; then
        echo "[entrypoint] WARNING: $var está vacía o usando default inseguro"
        WARN=1
    fi
done
[ "$WARN" -eq 1 ] && echo "[entrypoint] REVISÁ LAS VARIABLES DE ENTORNO ANTES DE USAR EN PRODUCCIÓN"

echo "[entrypoint] Arrancando agente como $USER_NAME..."
exec gosu "$USER_NAME" node server.js
