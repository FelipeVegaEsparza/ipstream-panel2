# Tasks

## 1. Hashing de contraseña asíncrono

- [x] 1.1 Agregar `@node-rs/bcrypt` a `package.json` e instalarlo; verificar con `node -e "const b=require('@node-rs/bcrypt'); b.hash('x',{cost:10}).then(h=>b.verify('x',h)).then(console.log)"` que da `true`
- [x] 1.2 Reemplazar `bcryptjs` por `@node-rs/bcrypt` en `lib/auth.ts`, `app/api/auth/register/route.ts`, `app/api/admin/users/route.ts`, `app/api/admin/users/[id]/route.ts`, `app/api/admin/create-super-user/route.ts` y `scripts/create-admin.js`, con cost 10; verificar con `npx tsc --noEmit`
- [x] 1.3 Quitar `bcryptjs` y `@types/bcryptjs` de `package.json` si no quedan usos; verificar con `grep -rn "bcryptjs" app lib scripts`

## 2. Caché de permisos de menú

- [x] 2.1 Crear `lib/menu-cache.ts` con caché por `clientId` (TTL `MENU_CACHE_TTL_MS`, default 30000) y `invalidateMenuCache(clientId?)`; verificar con `npx tsc --noEmit`
- [x] 2.2 Hacer que `getDisabledMenuItems` e `isMenuItemEnabled` (`lib/menu-permissions.ts`) lean/escriban en la caché; verificar que `npx tsc --noEmit` pasa y que el dashboard sigue mostrando el menú correcto
- [x] 2.3 Invalidar la caché al modificar el menú global (`app/api/admin/global-menu/route.ts`) y por cliente (`app/api/admin/clients/[id]/menu/route.ts`); verificar manualmente que un cambio se refleja de inmediato

## 3. Deduplicación de sesión por request

- [x] 3.1 Crear `lib/session.ts` con `getSession = cache(() => getServerSession(authOptions))`; verificar con `npx tsc --noEmit`
- [x] 3.2 Usar `getSession()` dentro de `lib/getEffectiveClient.ts`; verificar con `npx tsc --noEmit`
- [x] 3.3 Migrar las rutas de `app/api/**` que llaman `getServerSession(authOptions)` a `getSession()`; verificar con `grep -rn "getServerSession" app/api` (sin coincidencias) y `npx tsc --noEmit`

## 4. Caché HTTP de la API pública

- [x] 4.1 Crear `lib/http-cache.ts` con `publicCacheHeaders()` (`public, s-maxage=60, stale-while-revalidate=300`); verificar con `npx tsc --noEmit`
- [x] 4.2 Aplicar `publicCacheHeaders()` a los GET de contenido read-only de `app/api/public/[clientId]/*` (basic-data, news, programs, sponsors, promotions, announcers, podcasts, videos, galleries, events, social-networks, gc-bar, polls); verificar con `curl -sI` que incluye la cabecera `Cache-Control`
- [x] 4.3 Confirmar que los endpoints dinámicos (streaming/status, schedule/current, tv/schedule/current, chat on-line) y las escrituras siguen con `no-store`; verificar con `curl -sI` y `grep -rn "no-store" app/api/public`

## 5. Verificación de integración

- [x] 5.1 Correr `npm run build` (incluye `prisma generate` + `next build`) y verificar que compila sin errores
- [ ] 5.2 Ejecutar `loadtest/smoke.js` contra el entorno y verificar 0 fallos de checks
- [ ] 5.3 Repetir `loadtest/realistic.js` a 50 y 100 VUs y comparar el p95 contra la línea base (50 VUs: p95 ~408ms; 100 VUs: p95 ~1.5s); documentar el resultado en el change
