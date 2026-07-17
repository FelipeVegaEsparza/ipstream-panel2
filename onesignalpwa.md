# Integración de Notificaciones Push con OneSignal en la PWA

## Contexto para la IA

Eres una IA implementando notificaciones push en una **PWA de reproductor de radio**. El panel de administración ya gestiona el envío de notificaciones. Tu tarea es implementar el **lado del cliente** (PWA) para que los usuarios puedan suscribirse y recibir notificaciones.

## Endpoint de Configuración

La PWA obtiene su configuración desde:

```
GET https://panel-ipstream.com/api/public/{clientId}
```

**Respuesta relevante:**
```json
{
  "oneSignalAppId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "client": { "id": "abc123", "name": "Radio Ejemplo" }
}
```

Si `oneSignalAppId` es `null`, OneSignal no está configurado para este cliente.

## Implementación Paso a Paso

### 1. Instalar dependencias

```bash
npm install react-onesignal
```

### 2. Crear Service Worker

`public/OneSignalSDKWorker.js`:
```javascript
importScripts('https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js');
```

### 3. Inicializar OneSignal en el Layout

`app/layout.tsx` (o el layout principal de la app):
```tsx
'use client'

import { useEffect } from 'react'
import OneSignal from 'react-onesignal'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const clientId = 'REEMPLAZAR_CON_CLIENT_ID_REAL'

    fetch(`https://panel-ipstream.com/api/public/${clientId}`)
      .then(res => res.json())
      .then(data => {
        if (data.oneSignalAppId) {
          OneSignal.init({
            appId: data.oneSignalAppId,
            allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
            notifyButton: { enable: false },
          })
        }
      })
      .catch(err => console.error('Error al inicializar OneSignal:', err))
  }, [])

  return <html>{children}</html>
}
```

### 4. Componente de Botón de Suscripción

`components/NotificationButton.tsx`:
```tsx
'use client'

import { useState, useEffect } from 'react'
import OneSignal from 'react-onesignal'

export function NotificationButton() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!('Notification' in window)) {
      setIsSupported(false)
      setIsLoading(false)
      return
    }

    const check = async () => {
      try {
        const enabled = await OneSignal.isPushNotificationsEnabled()
        setIsSubscribed(enabled)
      } catch {
        // OneSignal aún no está listo
      } finally {
        setIsLoading(false)
      }
    }

    const timer = setTimeout(check, 1500)
    return () => clearTimeout(timer)
  }, [])

  const handleSubscribe = async () => {
    setIsLoading(true)
    try {
      await OneSignal.showSlidedownPrompt()
      setTimeout(async () => {
        const enabled = await OneSignal.isPushNotificationsEnabled()
        setIsSubscribed(enabled)
        setIsLoading(false)
      }, 1500)
    } catch (error) {
      console.error('Error al suscribirse:', error)
      setIsLoading(false)
    }
  }

  if (!isSupported) return null
  if (isLoading) return <button disabled className="...">...</button>

  if (isSubscribed) {
    return (
      <div className="...">
        <span>Notificaciones activadas</span>
      </div>
    )
  }

  return (
    <button onClick={handleSubscribe} className="...">
      <span>Activar notificaciones</span>
    </button>
  )
}
```

### 5. Integrar el Botón en la UI

Agrega `<NotificationButton />` en el header, sidebar, o menú de navegación de la PWA.

### 6. Manejar Clics en Notificaciones

El panel envía `data: { notificationId: "..." }` en cada notificación. OneSignal redirige automáticamente a la `targetUrl` si se configuró. Para tracking adicional:

```tsx
OneSignal.on('notificationClick', (event) => {
  console.log('Notificación clickeada:', event)
})
```

## Comportamiento Esperado

| Acción | Resultado |
|--------|-----------|
| Usuario abre la PWA por primera vez | Ve el botón "Activar notificaciones" |
| Usuario hace clic en "Activar" | OneSignal muestra el prompt de permiso del navegador |
| Usuario acepta | El botón cambia a "Notificaciones activadas" |
| Admin envía notificación desde el panel | Llega a todos los suscritos (incluso con PWA cerrada) |
| Usuario hace clic en la notificación | Redirige a la `targetUrl` configurada |

## Configurar Webhook de Clics (Opcional)

Para tracking de clics en el panel, configura en OneSignal Dashboard un webhook que apunte a:

```
POST https://panel-ipstream.com/api/webhook/onesignal
Authorization: Bearer {ONESIGNAL_WEBHOOK_SECRET}
```

## Notas Técnicas

- **HTTPS obligatorio** en producción. `localhost` funciona en desarrollo.
- **iOS Safari** no soporta push notifications en PWA (limitación de Apple).
- El `OneSignalSDKWorker.js` debe estar en `/public/` y ser accesible en `/OneSignalSDKWorker.js`.
- No usar el botón nativo de OneSignal (`notifyButton: { enable: false }`).

## Checklist

- [ ] Instalado `react-onesignal`
- [ ] Creado `public/OneSignalSDKWorker.js`
- [ ] Inicializado OneSignal en el layout con `appId` de la API
- [ ] Creado componente `NotificationButton`
- [ ] Integrado botón en la UI
- [ ] Probado en Chrome Desktop y Android
- [ ] Verificado que notificaciones llegan con PWA cerrada
