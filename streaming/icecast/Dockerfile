# =====================================================
# IPStream Panel — Icecast 2 image
# Build nuestra para tener control total y no depender
# de imágenes externas que pueden desaparecer.
# =====================================================

FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# Instalar Icecast 2 + utilidades
RUN apt-get update && apt-get install -y --no-install-recommends \
        icecast2 \
        curl \
        tini \
        ca-certificates \
        gettext-base \
    && rm -rf /var/lib/apt/lists/*

# Crear directorios necesarios
RUN mkdir -p /var/log/icecast2 /etc/icecast2 /var/lib/icecast2

# Crear usuario no-root para correr icecast
# (Icecast se niega a correr como root por seguridad)
# El paquete icecast2 ya crea el grupo `icecast`.
RUN useradd --system --uid 1001 --gid icecast --shell /usr/sbin/nologin --home /var/lib/icecast2 icecast || true

# Copiamos el template de configuración. Variables de entorno
# se sustituyen en runtime con envsubst.
COPY icecast.xml /etc/icecast2/icecast.xml

# El usuario icecast debe poder leer la config y escribir logs
RUN chown -R icecast:icecast /etc/icecast2 /var/log/icecast2 /var/lib/icecast2

# Entry point
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8000

# Correr como icecast (no root)
USER icecast

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["/usr/bin/icecast2", "-c", "/etc/icecast2/icecast.xml"]
