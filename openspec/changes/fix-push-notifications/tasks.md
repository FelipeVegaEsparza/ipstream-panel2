# Tasks

## 1. Configuración y secretos

- [x] 1.1 Setear `ONESIGNAL_WEBHOOK_SECRET` en el `.env` de producción y documentarlo como requerido para clicks; verificar que `/api/webhook/onesignal` responda 401 (no 500) sin secreto válido y procese con el correcto.
- [x] 1.2 Verificar que `CRON_SECRET` esté seteado y documentarlo en `.env.example`/`deploy/.env.prod.example`; verificar que el cron responda 401 sin Bearer válido.
- [x] 1.3 Agregar `oneSignalSafariWebId` a `Client` (schema), al `UserForm`/API de admin, y exponer `oneSignalSafariWebId` en `GET /api/public/[clientId]`; verificar `prisma db push` (o migración) y typecheck.

## 2. Helper de envío unificado

- [x] 2.1 Crear un helper server-only (p. ej. `lib/push-notifications.ts`) con `sendPushNotification(client, payload)` que encripta/desencripta la API Key, fija `isAnyWeb` e icono, agrega `data.notificationId` y normaliza `{ok,id,recipients,error}`; verificar con un envío de prueba a un cliente.
- [x] 2.2 Documentar el helper y su contrato en el código; verificar que no queden llamadas directas a OneSignal fuera del helper.

## 3. Rutas (dashboard, cron, webhook)

- [x] 3.1 Refactorizar `app/api/dashboard/push-notifications/route.ts` para usar el helper; verificar envío inmediato (`status=sent`, `recipientsCount`) y programado (`status=pending`).
- [x] 3.2 Refactorizar `app/api/cron/send-pending-notifications/route.ts` para usar el helper e idempotencia (`pending`→`sending` condicional); verificar que dos corridas solapadas no reenvíen.
- [x] 3.3 Verificar el webhook de clicks end-to-end: con el secreto correcto, un click incrementa `clicksCount` (por ID propio o por ID de OneSignal).

## 4. Cron scheduling (infra)

- [x] 4.1 Agendar `POST /api/cron/send-pending-notifications` (cada 1 min, con `CRON_SECRET`) en el VPS (crontab o timer); verificar que una notificación programada pase a `sent` sin intervención manual.
- [x] 4.2 Documentar el agendado del cron (y el de `chat/cleanup` si aplica) en `README.md`/`resumen.md`.

## 5. Receptor en la PWA (`pwa/`)

- [x] 5.1 Agregar el OneSignal Web SDK v16 a `pwa/package.json` e instalarlo; verificar `cd pwa && npm run build` y `npm run test` sin errores.
- [x] 5.2 Inicializar el SDK en la PWA con el `oneSignalAppId` de `FullClientData` (y `oneSignalSafariWebId`) una vez resuelto el tenant, sin inicializar cuando el appId es `null`; verificar en dev/localhost que no rompe si falta el appId.
- [x] 5.3 Crear `pwa/public/push/onesignal/OneSignalSDKWorker.js` (`importScripts` del SDK v16) y configurar el init con `serviceWorkerPath` y `serviceWorkerParam` (scope `/push/onesignal/`); verificar que el archivo se sirve y que una notificación se muestra con la PWA cerrada en Chrome Android/desktop.
- [x] 5.4 Manejar el clic de notificación abriendo `targetUrl`; verificar que el clic navega a la URL configurada.
- [x] 5.5 Añadir UX de suscripción opt-in (botón/aviso) en el template/app; verificar que antes del permiso no suscribe y tras aceptar la `PushSubscription` queda activa (y no se auto-prompta).
- [ ] 5.6 Verificar aislamiento multi-tenant: una suscripción en el dominio de un cliente cae en su App de OneSignal y no recibe notificaciones de otro cliente.
- [x] 5.7 Cubrir la recepción con tests (Vitest) donde sea viable (p. ej. helper de init/estado de suscripción) y verificar `cd pwa && npm test`.

## 6. Documentación PWA / OneSignal

- [x] 6.1 Reescribir `onesignalpwa.md` para la PWA en este repo: SDK v16 (`OneSignal.User.PushSubscription`), `safari_web_id`, requisito de instalación en iOS, e integración con `pwa/src/sw.ts`; verificar que los ejemplos sean coherentes con el SDK actual y con `pwa/`.
- [x] 6.2 Documentar en `pwa/docs/` (o `pwa/AGENTS.md`) el flujo de suscripción y el troubleshooting (permiso, iOS, SW); verificar que las rutas y comandos citados existan.

## 7. Verificación end-to-end

- [ ] 7.1 Con un cliente real y un dispositivo suscrito desde su PWA: enviar **inmediata** y **programada**, confirmar entrega (`recipients > 0`), registrar un **click** (verificar `clicksCount`) y confirmar la recepción con la PWA cerrada; documentar el resultado y cerrar el change.
