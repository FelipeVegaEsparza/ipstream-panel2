# Proposal

## Why

El sistema de notificaciones push (OneSignal) del panel está mayormente implementado, pero tiene **dos fallas reales en producción** y varias de robustez:

1. **`ONESIGNAL_WEBHOOK_SECRET` no está configurado** en el `.env` de producción → el webhook `/api/webhook/onesignal` responde 500 y **`clicksCount` nunca se actualiza** (tracking de clicks roto).
2. **No hay scheduler** para `/api/cron/send-pending-notifications` (ni crontab, ni timer, ni Actions) → las **notificaciones programadas nunca se envían**.
3. Robustez/inconsistencia: lógica de envío duplicada (dashboard vs cron), sin plataforma explícita ni icono del push web, sin idempotencia en el cron, y documentación de la PWA desalineada (SDK v15 vs v16, dominio y `safari_web_id`).
4. **La PWA no tiene el lado receptor**: no incluye el SDK de OneSignal, no registra el service worker de push, no ofrece UX de suscripción y no maneja el clic. Aunque el panel envíe, ningún oyente puede suscribirse ni recibir. Ahora que la PWA vive en este repo (`pwa/`), esto es implementable aquí (el plan original asumía "otro repo").

El objetivo es que un cliente pueda **suscribir dispositivos, enviar inmediatas y programadas, y ver métricas (entregados y clicks)** de forma confiable, de punta a punta panel → oyente.

## What Changes

- **Configuración de OneSignal**: documentar y exigir `ONESIGNAL_WEBHOOK_SECRET`; dejar la webhook de clicks operativa; verificar la compatibilidad de `included_segments: ['All']` con el modelo de suscripciones que use la PWA.
- **Cron de programadas**: agendar `send-pending-notifications` (cada 1 min) con `CRON_SECRET`.
- **Unificar el envío**: extraer la lógica de envío a un helper compartido por la ruta del dashboard y el cron.
- **Emitir a web**: fijar plataforma web (`isAnyWeb`) e incluir icono/badge del push web.
- **Idempotencia** en el cron para evitar reenvíos por solapamiento.
- **Receptor en la PWA (en este repo)**: integrar OneSignal Web SDK v16 en `pwa/`, inicializarlo con el `oneSignalAppId` del tenant resuelto por dominio, registrar/importar el service worker de push dentro de `pwa/src/sw.ts` (build `injectManifest`) para recibir con la PWA cerrada, y agregar UX de suscripción opt-in. Manejar `notificationclick` y `targetUrl`.
- **Documentación**: alinear `onesignalpwa.md` al SDK actual (v16), dominio real, e integrar `safari_web_id` para iOS/Safari.

## Capabilities

### New Capabilities
- `notifications/push`: envío de notificaciones push por cliente (inmediatas y programadas) vía OneSignal, tracking de entrega/clicks y operación de suscripción de la PWA.

### Modified Capabilities
- (ninguna: no existe una capability de notificaciones en `openspec/specs/`)

## Impact

- **Panel:** `app/api/dashboard/push-notifications/route.ts`, `app/api/cron/send-pending-notifications/route.ts`, `app/api/webhook/onesignal/route.ts`; posible helper nuevo en `lib/`.
- **PWA (`pwa/`, mismo repo):** `pwa/package.json` (SDK OneSignal v16), `pwa/src/sw.ts` (import del worker de push), init del SDK + UX de suscripción en `pwa/src/app` / templates, y `pwa/src/core` (config del appId del tenant). Un cambio solo de `pwa/**` republica el bundle (workflow `deploy-site-bundle.yml`), no el panel.
- **Infra:** `.env` de producción (`ONESIGNAL_WEBHOOK_SECRET`), agendado del cron (crontab/timer), app de OneSignal de cada cliente (webhook + web platform + Safari Web ID).
- **DB:** cambio aditivo y opcional: columna `Client.oneSignalSafariWebId` (para iOS/Safari), expuesta en la API pública. `push_notifications` y `pwa_installs` no cambian.
- **No-goals:** integrar SDKs nativos iOS/Android, segmentación avanzada por usuario, y multi-idioma de contenidos.
