# =====================================================
# IPStream Panel — Dockerfile (producción)
# =====================================================
# Multi-stage optimizado con BuildKit cache mounts.
# Usa npm ci con caché de node_modules para rebuilds rápidos.
#
# Para builds locales con cache mounts:
#   DOCKER_BUILDKIT=1 docker build -t app .
# GitHub Actions usa BuildKit por default.
# =====================================================

# ---------- Base ----------
FROM node:20-bookworm-slim AS base
WORKDIR /app

# Prisma necesita openssl; sharp/libvips también
RUN apt-get update && apt-get install -y --no-install-recommends \
        openssl \
        ca-certificates \
        tini \
        curl \
    && rm -rf /var/lib/apt/lists/*

# ---------- 1. Dependencias (con caché de layers — requiere BuildKit) ----------
FROM base AS deps

# Copiamos solo lo necesario para resolver deps.
# prisma/schema es necesario porque el postinstall corre `prisma generate`.
COPY package.json package-lock.json* pnpm-lock.yaml* ./
COPY prisma ./prisma

# Cache mount: guarda node_modules entre builds (solo con BuildKit).
# Sin BuildKit, este RUN funciona igual pero sin caché.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# ---------- 2. Build ----------
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Traemos node_modules ya instalados del stage anterior
COPY --from=deps /app/node_modules ./node_modules
# Copiamos el código fuente
COPY . .

# Cache mount para .next: reutiliza el cache de Next.js entre builds (BuildKit)
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ---------- 3. Runner (producción) ----------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Labels de trazabilidad (útiles con `docker inspect`)
LABEL org.opencontainers.image.title="IPStream Panel" \
      org.opencontainers.image.description="Next.js dashboard + streaming agent" \
      org.opencontainers.image.source="https://github.com/ipstream/panel" \
      org.opencontainers.image.licenses="UNLICENSED"

# Usuario no-root
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Copiamos todo lo necesario para correr
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./next.config.js
COPY --from=builder --chown=nextjs:nodejs /app/tailwind.config.js ./tailwind.config.js
COPY --from=builder --chown=nextjs:nodejs /app/postcss.config.js ./postcss.config.js
COPY --from=builder --chown=nextjs:nodejs /app/next-env.d.ts ./next-env.d.ts
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/types ./types
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/components ./components
COPY --from=builder --chown=nextjs:nodejs /app/app ./app
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh

# Volumen para uploads subidos por los clientes
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads
VOLUME ["/app/public/uploads"]

USER nextjs

EXPOSE 3000

# Healthcheck más robusto: hit al endpoint de health
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/usr/bin/tini", "--", "./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
