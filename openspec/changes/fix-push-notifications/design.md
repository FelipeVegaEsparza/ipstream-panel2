# Design

## Context

Ver `proposal.md` (Why). Estado actual relevante:
- `POST /api/dashboard/push-notifications` y `POST /api/cron/send-pending-notifications` **duplican** la llamada a `https://onesignal.com/api/v1/notifications` con `included_segments: ['All']` y `Authorization: Basic <apiKey>`.
- `POST /api/webhook/onesignal` exige `ONESIGNAL_WEBHOOK_SECRET` (Bearer, comparación de tiempo constante) pero **no está seteado** en producción.
- No hay scheduler del cron. La notificación es inmediata (en el POST) o programada (`status='pending'` + `scheduledFor`).
- API Key encriptada (AES-256-GCM), fallback a texto plano.

## Goals / Non-Goals

**Goals:**
- Dejar operativo el tracking de clicks y el envío de programadas.
- Unificar la lógica de envío y endurecerla (plataforma, icono, idempotencia).
- Documentar y verificar la integración PWA/OneSignal.

**Non-Goals:**
- SDKs nativos móviles, segmentación avanzada, multi-idioma de contenidos.
- Cambios de esquema en DB.

## Decisions

### D1. Helper de envío único
Extraer `sendPushNotification(client, { title, message, imageUrl, targetUrl, notificationId })` a `lib/` (server-only) que encapsula la llamada a OneSignal y el manejo de respuesta. La ruta del dashboard y el cron lo consumen. Evita la divergencia actual.

### D2. Plataforma y presentación web
Fijar `isAnyWeb: true` (el canal es web/PWA) e incluir `chrome_web_icon`/`chrome_web_badge` (icono del cliente si existe, si no dejar el default de OneSignal). Alternativa descartada: dejarlo sin plataforma → entrega a plataformas no usadas.

### D3. Idempotencia del cron
Antes de enviar, hacer una transición condicional de estado (`pending` → `sending`) y omitir si no se afectó ninguna fila. Evita doble envío si dos corridas se solapan. Alternativa: lock distribuido (sobre‑ingeniería para este volumen).

### D4. Scheduling del cron
Agendar `POST /api/cron/send-pending-notifications` cada 1 min con `CRON_SECRET`. Opciones: **crontab del VPS** (curl) o **systemd timer**. Se elige crontab por simplicidad; se documenta. (Se descarta depender de un servicio externo que no existe hoy.)

### D5. Secretos
- `ONESIGNAL_WEBHOOK_SECRET`: setear en `.env` de producción y en cada app de OneSignal (webhook click con header Bearer). `setup-prod.sh` ya lo lista; se documenta como **requerido para clicks**.
- Verificar que `CRON_SECRET` esté seteado (ya lo está).

### D6. Modelo OneSignal y conteo de entregas
Mantener la API v1 (`included_segments: ['All']`) y verificar con un dispositivo suscrito. **Hallazgo en producción:** la respuesta de creación trae `recipients: 0` aunque la entrega sea exitosa (`successful: 1`); la cantidad real está en las stats de la notificación (`GET /notifications/{id}` → `successful`, con `completed_at`). Por eso el helper, cuando `recipients` viene 0, consulta las stats (con reintentos acotados) y usa `successful` como `recipientsCount`. No se cambia de endpoint ni de modelo.

### D7. Documentación PWA
Actualizar `onesignalpwa.md` al SDK actual e incluir `safari_web_id` para iOS/Safari. El documento ya no debe asumir "otro repo": la PWA vive en `pwa/`.

### D8. SDK de la PWA y momento de init
Usar el **OneSignal Web SDK v16** en `pwa/` (paquete oficial / CDN). Inicializar el SDK **solo** después de resolver el tenant y obtener `oneSignalAppId` de `FullClientData` (ya expuesto en `GET /api/public/[clientId]`). Si es `null`, no se inicializa. Alternativa descartada: `react-onesignal` con la API v1 (`isPushNotificationsEnabled`/`showSlidedownPrompt`) — está desalineada con v16 y con la doc.

### D9. Service worker (worker de OneSignal en subcarpeta)
La PWA ya usa `vite-plugin-pwa` con `injectManifest` (`pwa/src/sw.ts` → `sw.js`, compilado como **módulo ES**). Se crea un worker dedicado **`pwa/public/push/onesignal/OneSignalSDKWorker.js`** (una línea: `importScripts` del SDK v16) y se inicializa OneSignal con `serviceWorkerPath: 'push/onesignal/OneSignalSDKWorker.js'` y `serviceWorkerParam: { scope: '/push/onesignal/' }`. Es la recomendación oficial para sitios con PWA: el worker raíz de la app (cacheo/precache workbox) queda intacto y no hay colisión de scope. Alternativas descartadas: combinar dentro de `sw.ts` (además de frágil, `importScripts` no existe en un worker ES) y worker en la raíz (compite por `/` con el de la PWA).

### D10. App ID por tenant
El App ID viene del tenant resuelto por host (`TenantContext` → `clientId` → `FullClientData.oneSignalAppId`). Como cada cliente se sirve en su propio dominio, el scope del SW y la App de OneSignal quedan aislados por origen. En dev, sin dominio de cliente, se usa el fallback del `clientId` horneado; si el appId es `null`, la UX de suscripción no se muestra.

### D11. UX de suscripción (opt-in)
Opt-in explícito mediante un **modal centrado con fondo oscurecido** (`PushOptIn`): no se pide permiso automáticamente al abrir. El usuario elige **Activar** o **Ahora no**. El modal se muestra solo si hay appId, el navegador soporta push, el permiso no está bloqueado y el usuario no está suscrito; "Ahora no" lo descarta por 24 h (no reaparece en cada carga). Alternativa descartada: `Slidesdown`/prompt automático — agresivo y peor tasa de aceptación.

### D12. iOS/Safari
Incluir `safari_web_id` en el init (requerido en Safari/iOS). Documentar que iOS requiere PWA **instalada** en pantalla de inicio (iOS 16.4+) para recibir push; actualizar la afirmación obsoleta "iOS no soporta push".
- El `safari_web_id` es por app de OneSignal: se agrega una columna `Client.oneSignalSafariWebId` (opcional), se expone en `GET /api/public/[clientId]` como `oneSignalSafariWebId` y la PWA lo lee junto al `oneSignalAppId` para pasarlo al `init`.

### D13. Identidad del dispositivo
No se usa `external_id`/alias de OneSignal por ahora: el envío sigue por `included_segments: ['All']` acotado a la App del cliente. El `deviceId` de `pwa_installs` se mantiene solo para estadística de instalación. Enlazar `OneSignal.login(deviceId)` queda como opción futura si se necesita segmentación.

## Risks / Trade-offs

- **[Cron cada 1 min]** → carga mínima (una query + fetch). Aceptado.
- **[`isAnyWeb`]** → si en el futuro agregan apps móviles, habría que ampliar. Documentado.
- **[Icono por cliente]** → si no hay logo, queda el default de OneSignal. Aceptado.
- **[Migración de estado `sending`]** → notificaciones que queden en `sending` por crash no se reenvían; se puede agregar un timeout de recuperación luego.
- **[SW de OneSignal dentro de `sw.ts`]** → puede chocar con estrategias de cacheo existentes; se verifica que el handler `push`/`notificationclick` quede activo tras el update del SW.
- **[Prompt de permiso]** → un prompt automático rechazado suele ser irreversible en el navegador; por eso opt-in explícito.
- **[`safari_web_id` no expuesto]** → sin él, iOS no recibe; hay que decidir cómo lo obtiene la PWA.
- **[iOS]** → sin PWA instalada no hay push; es limitación de la plataforma, se documenta.

## Migration Plan

1. Setear `ONESIGNAL_WEBHOOK_SECRET` en el `.env` de producción.
2. Agendar el cron en el VPS.
3. Desplegar el helper unificado + plataforma/icono + idempotencia (panel).
4. Implementar el receptor en `pwa/` (SDK, SW, UX opt-in) y publicar el bundle (push a `main`; el workflow `deploy-site-bundle.yml` se dispara con cambios en `pwa/**`).
5. Configurar el webhook en cada app de OneSignal y el Safari Web ID donde aplique.
6. Verificar inmediata + programada + click + suscripción real desde la PWA.
7. Rollback: revertir el commit del helper/receptor; el cron y el secreto son configurables sin código.

## Open Questions

- Fuente del icono por cliente (logo de BasicData vs default OneSignal) — se resuelve en implementación sin afectar specs.
- Transporte final del cron (crontab vs timer) — decisión de infra, no cambia el contrato.
- Enlazar `deviceId` como `external_id` de OneSignal para segmentación futura — diferido (ver D13).
