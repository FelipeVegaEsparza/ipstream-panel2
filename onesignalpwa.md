# Notificaciones Push con OneSignal en la PWA

Guía del **lado receptor** (PWA) y de su integración con el panel. La PWA ya
implementa todo esto en este repo (`pwa/`); este documento describe cómo está
armado y cómo configurarlo por cliente.

## Arquitectura

```
Panel (envía)                                  PWA (recibe)
─────────────                                  ────────────
/dashboard/notifications
   │ POST /api/dashboard/push-notifications
   ▼
lib/push-notifications.ts ── Basic Auth ──▶  OneSignal API v1
   │                                              │
   │ included_segments: ['All']                   ▼
   │ isAnyWeb, data.notificationId          OneSignal SDK v16 (react-onesignal)
   │                                              │
   └ programadas: cron cada 1 min                 ▼
                                        /push/onesignal/OneSignalSDKWorker.js
                                        (scope propio, no choca con el SW de la PWA)
```

- Cada cliente tiene **su propia App de OneSignal** (`oneSignalAppId`) → el
  segmento `All` queda aislado por cliente.
- El `data.notificationId` que envía el panel permite atribuir los clicks.

## Configuración por cliente (panel)

En `/admin/users/[id]/edit` → **Configuración OneSignal**:

| Campo | Uso |
|-------|-----|
| `OneSignal App ID` | App del cliente (requerido para enviar/suscribir) |
| `OneSignal REST API Key` | Envío desde el panel (se guarda encriptada) |
| `Safari Web ID` | Push en iOS/Safari (opcional) |

El `App ID` y el `Safari Web ID` se exponen en la API pública:

```http
GET https://panel.casterfly.com/api/public/{clientId}
```

```json
{
  "oneSignalAppId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "oneSignalSafariWebId": "web.onesignal.auto.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

Si `oneSignalAppId` es `null`, la PWA no inicializa OneSignal ni muestra el
botón de suscripción.

### Configurar la App en OneSignal (por cliente)

- Tipo de integración: **Custom Code** (no "Typical Site"). Nosotros pasamos el
  path del service worker por código (`serviceWorkerPath`/`serviceWorkerParam`);
  los campos de path del dashboard no aplican en Custom Code.
- **Site URL**: el dominio del cliente (esquema incluido, sin `www.` si no lo usás).
- **notifyButton**: no se usa; la PWA tiene su propio aviso opt-in (`PushOptIn`).

OneSignal muestra dos fragmentos al crear la app:

```js
// 1) Contenido del service worker → ya está en
//    pwa/public/push/onesignal/OneSignalSDKWorker.js
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
```

```html
<!-- 2) Snippet HTML con appId/safari_web_id → NO se pega en el proyecto.
     react-onesignal hace el init con esos valores leídos de la API pública. -->
<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
```

El `appId`, el `safari_web_id` y la REST API Key del snippet **van por cliente en
el panel**, nunca hardcodeados en la PWA (el bundle es único y compartido).

## Lado PWA (implementación actual)

- **SDK**: `react-onesignal` v3 (envoltorio del OneSignal Web SDK **v16**).
- **Init**: `pwa/src/modules/pwa/push.ts` → `initPush(appId, safariWebId)`.
  Se llama desde `PushOptIn` cuando ya se resolvió el tenant
  (`FullClientData.oneSignalAppId`). Usa:
  ```ts
  serviceWorkerPath: 'push/onesignal/OneSignalSDKWorker.js',
  serviceWorkerParam: { scope: '/push/onesignal/' }
  ```
- **Service worker**: `pwa/public/push/onesignal/OneSignalSDKWorker.js`:
  ```js
  importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
  ```
  Va en **subcarpeta** porque la PWA ya tiene su propio service worker workbox
  en `/` (`pwa/src/sw.ts`). Combinarlos está desaconsejado por OneSignal.
- **Opt-in**: `pwa/src/modules/pwa/PushOptIn.tsx` muestra un aviso con botón
  "Activar". No se pide permiso automáticamente al abrir.
- **Clic**: el panel envía `url: targetUrl`; el SDK abre la URL por defecto.

> La PWA **no** usa `OneSignalSDKWorker.js` en la raíz ni `sw.ts` para el push.

## iOS / Safari

- Requiere **iOS 16.4+** y que la PWA esté **instalada** en la pantalla de
  inicio (Safari no entrega push a una pestaña común).
- Requiere que el cliente tenga cargado su **Safari Web ID**, que la PWA pasa
  como `safari_web_id` en el `init`.

## Webhook de clicks (opcional)

Para que el panel cuente clicks, en OneSignal → Webhooks apuntar a:

```http
POST https://panel.casterfly.com/api/webhook/onesignal
Authorization: Bearer {ONESIGNAL_WEBHOOK_SECRET}
```

Debe estar seteado `ONESIGNAL_WEBHOOK_SECRET` en el `.env` del panel; sin él el
webhook no puede verificar la petición y no incrementa `clicksCount`.

## Checklist

- [ ] `oneSignalAppId` (y API Key) cargados por cliente en el panel
- [ ] Web platform activada en la App de OneSignal (Site URL = dominio del cliente)
- [ ] `Safari Web ID` cargado si se quiere iOS (y app instalada)
- [ ] Webhook de clicks configurado + `ONESIGNAL_WEBHOOK_SECRET` en producción
- [ ] Probado en Chrome desktop y Android; iOS con la PWA instalada
