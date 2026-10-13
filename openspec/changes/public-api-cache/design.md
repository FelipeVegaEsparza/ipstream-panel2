# Design

## Context

Ver `proposal.md - Why`. El panel corre con 3 workers (cluster); cada uno es un proceso Node con su propia memoria. No hay Redis. El contenido público ya se marca `Cache-Control` pero no hay CDN/cache delante, así que cada request llega al Node.

## Goals / Non-Goals

**Goals:**
- Bajar CPU/DB por request público cacheando respuestas read-only unos segundos.
- Mantener frescura aceptable (lo nuevo aparece casi al instante).

**Non-Goals:**
- Consistencia perfecta entre workers (eso requeriría store compartido).
- Cachear endpoints dinámicos/por-usuario.

## Decisions

**1. Caché en proceso keyed por `método + pathname + query`.**
`lib/public-cache.ts` con un `Map<string, { at, status, body, headers }>`, TTL `PUBLIC_CONTENT_CACHE_TTL_MS` (default 10000; `0` desactiva). La clave incluye el `clientId` (está en la URL), así que es naturalmente por cliente.

**2. Wrapper `withPublicContentCache(handler)`.**
Envuelve el GET: en *hit* devuelve la respuesta cacheada; en *miss* ejecuta el handler, y si es `200` guarda una copia (body + headers). Se aplica a los 18 GET read-only. Evita tocar la lógica interna de cada ruta.
- Alternativa descartada: cachear dentro de cada ruta (más ediciones y más acoplamiento).

**3. Invalidación en las escrituras.**
`invalidatePublicCache(clientId?)` limpia las entradas de ese cliente (o todas). Se llama en las rutas de escritura de contenido. Con cluster, invalida el worker que atiende la escritura; el resto refresca dentro del TTL.
- Alternativa descartada: extensión de Prisma (cambia el tipo del cliente e impacta 100+ usos) y Redis (infra nueva).

**4. Frescura.**
El TTL (10 s) es la garantía; la invalidación local la mejora. Para "inmediato en todos los workers" habría que usar un store compartido (fase futura).

## Risks / Trade-offs

- **Staleness ≤ TTL en workers que no escriben** → TTL corto + invalidación local; aceptado.
- **Contenido dinámico cacheado por error** → solo se envuelven los 18 GET read-only de la lista blanca; el resto no.
- **Memoria** → cuerpos JSON chicos por cliente+endpoint; se limpia por TTL en cada *miss* (barrido perezoso).
- **Wrapper cambia la firma de `GET`** → typecheck (`tsc --noEmit`) + `next build` obligatorios.
- **Sin CDN** → la caché solo ayuda al Node (que es el objetivo actual).

## Migration Plan

1. Implementar y `tsc`/`build`.
2. Deploy; verificar con `curl` (frescura) y re-medir `mixed.js`.
3. Rollback: redeploy del tag anterior.

## Open Questions

- Ninguna bloqueante. Si más adelante se suma Redis o Cloudflare, esta caché se complementa.
