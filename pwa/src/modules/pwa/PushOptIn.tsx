import { useEffect, useState } from 'react'
import styles from './PushOptIn.module.css'
import { readString, writeString } from '@/core/storage/safeStorage'
import {
  initPush,
  isPushSubscribed,
  isPushSupported,
  onPushSubscriptionChange,
  optInPush
} from './push'

interface PushOptInProps {
  appId: string | null | undefined
  safariWebId?: string | null
}

const DISMISS_KEY = 'ipstream_push_prompt_dismissed'
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000

function isPermissionDenied(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'denied'
  )
}

/** ¿El usuario descartó el aviso hace poco? (evita repetirlo en cada carga) */
function isDismissedRecently(): boolean {
  const raw = readString(DISMISS_KEY)
  if (!raw) return false
  const ts = Number(raw)
  return Number.isFinite(ts) && Date.now() - ts < DISMISS_TTL_MS
}

/**
 * Modal de suscripción a notificaciones push. Opt-in explícito: no se pide
 * permiso al abrir la app; el usuario elige Activar o Ahora no. Solo aparece si
 * el cliente tiene App de OneSignal, el navegador soporta push, el permiso no
 * está bloqueado y el usuario no está suscrito.
 */
export function PushOptIn({ appId, safariWebId }: PushOptInProps) {
  const [supported] = useState(isPushSupported)
  const [denied] = useState(isPermissionDenied)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dismissed, setDismissed] = useState(isDismissedRecently)

  useEffect(() => {
    if (!appId || !supported) return

    let active = true
    let unsubscribe = () => {}

    void initPush(appId, safariWebId).then((ok) => {
      if (!active || !ok) return
      setSubscribed(isPushSubscribed())
      unsubscribe = onPushSubscriptionChange(setSubscribed)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [appId, safariWebId, supported])

  if (!appId || !supported || denied || subscribed || dismissed) return null

  const handleActivate = async () => {
    setBusy(true)
    try {
      setSubscribed(await optInPush())
    } finally {
      setBusy(false)
    }
  }

  const handleDismiss = () => {
    writeString(DISMISS_KEY, String(Date.now()))
    setDismissed(true)
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="push-optin-title">
      <div className={styles.card}>
        <div className={styles.icon} aria-hidden="true">
          <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
        <h2 id="push-optin-title" className={styles.title}>
          Activa las notificaciones
        </h2>
        <p className={styles.subtitle}>
          Recibe avisos de nuevos contenidos y transmisiones en vivo. Puedes
          desactivarlas cuando quieras.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.decline}
            onClick={handleDismiss}
            disabled={busy}
          >
            Ahora no
          </button>
          <button
            type="button"
            className={styles.accept}
            onClick={handleActivate}
            disabled={busy}
          >
            {busy ? 'Activando…' : 'Activar'}
          </button>
        </div>
      </div>
    </div>
  )
}
