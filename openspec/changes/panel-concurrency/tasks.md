# Tasks

## 1. Cluster de Node en el contenedor

- [x] 1.1 Crear `server.js` (primario + workers con `cluster`, puerto compartido, reinicio de workers, SIGTERM) y verificar con `node --check server.js`
- [x] 1.2 Actualizar `Dockerfile` (copiar `server.js` al runner y `CMD ["node","server.js"]`) y verificar con `npm run build`
- [x] 1.3 Condicionar el poller en `instrumentation.ts` para que solo corra con `PANEL_POLLER !== '0'`; verificar con `npx tsc --noEmit`
- [x] 1.4 Agregar `WEB_CONCURRENCY` a `deploy/docker-compose.prod.yml` y a `.env.example`; verificar que `docker compose config` no falla por la variable

## 2. Rate-limit compartido en MySQL

- [x] 2.1 Agregar el modelo `RateLimit` (`rate_limits`: `identifier` PK, `count`, `resetAt`) a `prisma/schema.prisma` y verificar con `npx prisma validate` + `npx prisma generate`
- [x] 2.2 Reescribir `lib/rate-limit.ts` como asíncrono con backend MySQL (upsert atómico + lectura + limpieza perezosa + fail-open) y verificar con `npx tsc --noEmit`
- [x] 2.3 Actualizar los llamadores a `await rateLimit(...)` (`lib/auth.ts`, `app/api/auth/register/route.ts`, `app/api/public/[clientId]/chat/messages/route.ts`, `app/api/public/[clientId]/contact-messages/route.ts`, `app/api/public/[clientId]/polls/[id]/vote/route.ts`, `app/api/dashboard/push-notifications/route.ts`) y verificar con `npx tsc --noEmit`
- [x] 2.4 Verificar en runtime que la tabla se crea y que el límite aplica (login y registro) contra el entorno

## 3. Verificación de integración

- [x] 3.1 Correr `npm run build` sin errores
- [x] 3.2 Ejecutar `loadtest/smoke.js` y verificar 0 fallos de checks
- [x] 3.3 Ejecutar `loadtest/realistic.js` a 100 VUs y verificar throughput mayor que la línea base (112 req/s) y CPU repartida entre núcleos
