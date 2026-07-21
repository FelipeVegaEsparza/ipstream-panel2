# =====================================================
# IPStream Video Encoder — FFmpeg
# =====================================================
# Contenedor para ejecutar procesos FFmpeg por cliente.
# El agente hace `docker exec` para lanzar/kill procesos.

FROM alpine:3.20

RUN apk add --no-cache ffmpeg bash curl

RUN mkdir -p /var/lib/video /var/log/video-encoder

VOLUME ["/var/lib/video", "/var/log/video-encoder"]

CMD ["sleep", "infinity"]
