import { useEffect, useState } from 'react'
import styles from './PushOptIn.module.css'
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

/**
 * Aviso de suscripción a notificaciones push. Opt-in explícito: no se pide
 * permiso al abrir la app. Solo aparece si el cliente tiene App de OneSignal,
 * el navegador soporta push y el usuario no está suscrito.
 */
export function PushOptIn({ appId, safariWebId }: PushOptInProps) {
  const [supported] = useState(isPushSupported)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dismissed, setDismissed] = useState(false)

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

  if (!appId || !supported || subscribed || dismissed) return null

  const handleActivate = async () => {
    setBusy(true)
    try {
      setSubscribed(await optInPush())
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.banner} role="dialog" aria-label="Activar notificaciones">
      <div className={styles.text}>
        <span className={styles.title}>¿Activar notificaciones?</span>
        <span className={styles.subtitle}>
          Recibe avisos de nuevos contenidos y transmisiones en vivo.
        </span>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.accept}
          onClick={handleActivate}
          disabled={busy}
        >
          {busy ? 'Activando…' : 'Activar'}
        </button>
        <button
          type="button"
          className={styles.dismiss}
          onClick={() => setDismissed(true)}
          aria-label="Ahora no"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
