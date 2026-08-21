# =====================================================
# IPStream Video Encoder — FFmpeg
# =====================================================
# Contenedor para ejecutar procesos FFmpeg por cliente.
# El agente hace `docker exec` para lanzar/kill procesos.

# alpine:3.21 trae FFmpeg 7.x, que soporta demux enhanced RTMP (HEVC/AV1 en
# FLV) para la Conexión Universal. 3.20 trae FFmpeg 6.1 que no lo soporta.
FROM alpine:3.21

RUN apk add --no-cache ffmpeg bash curl

RUN mkdir -p /var/lib/video /var/log/video-encoder

VOLUME ["/var/lib/video", "/var/log/video-encoder"]

CMD ["sleep", "infinity"]
