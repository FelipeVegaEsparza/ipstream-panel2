import type { IOneSignalOneSignal } from 'react-onesignal'

/**
 * Receptor de push de la PWA (OneSignal Web SDK v16).
 *
 * El worker de OneSignal vive en una subcarpeta (`/push/onesignal/`) con scope
 * propio para no colisionar con el service worker de la PWA (workbox) que
 * controla `/`. Ver `pwa/public/push/onesignal/OneSignalSDKWorker.js`.
 *
 * El `appId` es el de la App de OneSignal del cliente resuelto por dominio
 * (`FullClientData.oneSignalAppId`); si falta, no se inicializa nada.
 */

export const ONESIGNAL_WORKER_PATH = 'push/onesignal/OneSignalSDKWorker.js'
export const ONESIGNAL_WORKER_SCOPE = '/push/onesignal/'

let oneSignal: IOneSignalOneSignal | null = null
let initializedAppId: string | null = null
let initializing: Promise<void> | null = null

/** ¿El navegador soporta push web (Notification + service workers)? */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'Notification' in window && 'serviceWorker' in navigator
}

/**
 * Inicializa OneSignal una sola vez por `appId`. Devuelve `true` si quedó
 * inicializado. No-op si falta el `appId`.
 */
export async function initPush(
  appId?: string | null,
  safariWebId?: string | null
): Promise<boolean> {
  if (!appId) return false
  if (oneSignal && initializedAppId === appId) return true

  if (initializing) {
    await initializing
    return initializedAppId === appId
  }

  initializing = (async () => {
    const { default: OneSignal } = await import('react-onesignal')
    await OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: import.meta.env.DEV,
      serviceWorkerPath: ONESIGNAL_WORKER_PATH,
      serviceWorkerParam: { scope: ONESIGNAL_WORKER_SCOPE },
      ...(safariWebId ? { safari_web_id: safariWebId } : {})
    })
    oneSignal = OneSignal
    initializedAppId = appId
  })()

  try {
    await initializing
  } finally {
    initializing = null
  }

  return initializedAppId === appId
}

export function isPushSubscribed(): boolean {
  return Boolean(oneSignal?.User?.PushSubscription?.optedIn)
}

/** Pide el permiso/opt-in del navegador. Devuelve el estado resultante. */
export async function optInPush(): Promise<boolean> {
  if (!oneSignal) return false
  await oneSignal.User.PushSubscription.optIn()
  return isPushSubscribed()
}

/**
 * Escucha cambios del estado de suscripción. Devuelve la función para
 * desuscribirse del listener.
 */
export function onPushSubscriptionChange(
  callback: (subscribed: boolean) => void
): () => void {
  const instance = oneSignal
  if (!instance) return () => {}

  const handler = () => callback(isPushSubscribed())
  instance.User.PushSubscription.addEventListener('change', handler)

  return () => {
    instance.User.PushSubscription.removeEventListener('change', handler)
  }
}
