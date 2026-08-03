# =====================================================
# IPStream Streaming Agent — Node.js + Fastify
# =====================================================
# Servicio que controla liquidsoap + icecast por cliente.
# Es el "sidecar" que el IPStream Panel consume vía HTTP+WS.

FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

# ---------- Runtime ----------
FROM node:20-bookworm-slim
WORKDIR /app

# tini + docker CLI (para `docker exec` en el container de liquidsoap) + curl
RUN apt-get update && apt-get install -y --no-install-recommends \
        tini \
        curl \
        ca-certificates \
        docker.io \
    && rm -rf /var/lib/apt/lists/*

# Verificar
RUN node --version && docker --version

# Copiamos solo lo necesario
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY server.js ./
COPY lib ./lib
COPY routes ./routes

# Creamos directorios que vamos a montar
RUN mkdir -p /var/lib/radio /var/log/liquidsoap /etc/liquidsoap/scripts

# Usuario no-root. En producción, el socket de Docker del host debe tener
# el grupo `docker` con gid 999 o montarse con permisos para este usuario.
RUN groupadd --system --gid 1001 nodejs \
    && groupadd --system --gid 999 docker 2>/dev/null || true \
    && useradd --system --uid 1001 --gid nodejs --groups docker streamagent \
    && chown -R streamagent:nodejs /app /var/lib/radio /var/log/liquidsoap /etc/liquidsoap/scripts

USER streamagent

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://localhost:4000/health || exit 1

ENTRYPOINT ["/usr/bin/tini", "--", "node", "server.js"]
