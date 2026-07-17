# =====================================================
# IPStream Panel — Liquidsoap image
# Base: Debian bookworm + liquidsoap + ffmpeg
# =====================================================
#
# En esta Fase 0 sirve para validar el flujo:
#   MP3 → liquidsoap → icecast → listener
#
# En fases siguientes, este container va a estar supervisado
# por el streaming-agent (que generará los .liq por cliente).

FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# Liquidsoap + ffmpeg + herramientas.
# Liquidsoap trae sus propias deps (libsamplerate, libmp3lame, etc.),
# así que dejamos que apt resuelva.
RUN apt-get update && apt-get install -y --no-install-recommends \
        liquidsoap \
        ffmpeg \
        curl \
        jq \
        tini \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Verificar instalación
RUN liquidsoap --version && ffmpeg -version | head -1

# Directorios
RUN mkdir -p /var/lib/radio /var/log/liquidsoap /etc/liquidsoap/scripts
WORKDIR /var/lib/radio

# Script de inicio
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Volúmenes
VOLUME ["/var/lib/radio", "/var/log/liquidsoap", "/etc/liquidsoap/scripts"]

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["test.liq"]
