# Tasks

## 1. Backend / DB

- [x] 1.1 Agregar `installedAt DateTime?` a `PwaInstall` en `prisma/schema.prisma`; verificar `npx prisma generate` y `npx tsc --noEmit` sin errores.
- [x] 1.2 Extender `POST /api/public/[clientId]/pwa/register` para aceptar `installed: true` y setear `installedAt` de forma idempotente (upsert; no re-marca); verificar con dos POST iguales que no duplica ni cambia el conteo.
- [x] 1.3 Cambiar `GET /api/dashboard/pwa-stats` para devolver la cantidad de instalaciones (`installedAt` no nulo) del cliente efectivo; verificar con filas de prueba (con y sin `installedAt`) que solo cuenta las marcadas y aísla por cliente.

## 2. PWA (`pwa/`)

- [x] 2.1 Reportar la instalación al panel al detectar modo standalone al cargar o el evento `appinstalled`, una sola vez por dispositivo; verificar `cd pwa && npm run build` y `npm run typecheck`.
- [x] 2.2 Cubrir con tests (Vitest) que la señal se envía una vez y que **no** se envía al usar la PWA solo en el navegador; verificar `cd pwa && npm test`.

## 3. UI del dashboard

- [x] 3.1 Agregar la tarjeta "PWA instalada" a `components/dashboard/DashboardOverviewCards.tsx` con tokens de marca y layout responsivo (grid de 3 → 4); verificar en el home del dashboard y con valor 0.
- [x] 3.2 Retirar o reescribir `components/dashboard/PwaSubscribersCard.tsx` (huérfano, con gradientes fuera de marca); verificar que no quede código sin usar ni colores crudos.

## 4. Verificación end-to-end

- [ ] 4.1 Con un cliente real: los números arrancan en 0; instalar la PWA y abrir la app instalada sube la tarjeta a 1; una visita desde el navegador (sin instalar) no incrementa; y el conteo de un cliente no incluye instalaciones de otro.
