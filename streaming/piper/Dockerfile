# =====================================================
# IPStream Piper TTS — locuciones de clima y hora
# =====================================================
# Mantiene el modelo cargado en disco y el proceso vivo.
# El agente ejecuta `docker exec -i ... piper` para generar WAV.

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt /voices \
    && curl -fsSL \
        https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz \
        | tar xz -C /opt \
    && curl -fsSL -o /voices/es_ES-davefx-medium.onnx \
        https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/davefx/medium/es_ES-davefx-medium.onnx \
    && curl -fsSL -o /voices/es_ES-davefx-medium.onnx.json \
        https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/davefx/medium/es_ES-davefx-medium.onnx.json

ENV PATH="/opt/piper:${PATH}"

CMD ["sleep", "infinity"]
