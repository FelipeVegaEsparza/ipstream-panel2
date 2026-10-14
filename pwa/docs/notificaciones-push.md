# Notificaciones push (receptor en la PWA)

La PWA recibe push con el **OneSignal Web SDK v16** (vía `react-onesignal` v3).
El envío lo hace el panel por cliente; acá vive el lado receptor.

## Archivos

| Archivo | Rol |
|---------|-----|
| `src/modules/pwa/push.ts` | Init del SDK, estado de suscripción, opt-in |
| `src/modules/pwa/PushOptIn.tsx` | Aviso/botón opt-in (no auto-prompt) |
| `public/push/onesignal/OneSignalSDKWorker.js` | Service worker de OneSignal (subcarpeta, scope propio) |

## Flujo

1. La PWA resuelve el tenant por dominio y carga `FullClientData`.
2. Si `oneSignalAppId` existe, `PushOptIn` llama a `initPush(appId, safariWebId)`.
3. `initPush` carga el SDK y registra el worker en
   `push/onesignal/OneSignalSDKWorker.js` con scope `/push/onesignal/`.
4. El aviso aparece solo si el navegador soporta push y el usuario no está
   suscrito. Al pulsar **Activar**, `optInPush()` pide el permiso del navegador.
5. La suscripción cae en la App de OneSignal del cliente (aislada por dominio).

El worker va en subcarpeta a propósito: la PWA ya tiene su service worker workbox
en `/` (`src/sw.ts`), y OneSignal recomienda no compartir scope con la PWA.

## Troubleshooting

- **No aparece el aviso**: el cliente no tiene `oneSignalAppId`, o el navegador
  no soporta push, o ya está suscrito.
- **El botón no suscribe**: revisar el permiso de notificaciones del navegador;
  si se rechazó antes, hay que reactivarlo desde la config del sitio.
- **`OneSignalSDKWorker.js` 404**: verificar que el build copió
  `public/push/onesignal/` a `dist/` (`npm run build` → `dist/push/onesignal/`).
- **iOS no recibe**: requiere iOS 16.4+, la PWA instalada en pantalla de inicio
  y el `Safari Web ID` cargado por el cliente.
- **No llegan aunque esté suscrito**: confirmar que el `appId`/Site URL de la App
  de OneSignal corresponde al dominio del cliente.

## Comandos

```bash
cd pwa
npm run build      # emite dist/ (incluye el worker)
npm run test       # cubre push.ts con react-onesignal mockeado
```
