import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './InstallPrompt.module.css'
import { InstallHelpModal, type InstallPlatform } from './InstallHelpModal'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallPromptSubscriber = (event: BeforeInstallPromptEvent) => void

const subscribers = new Set<InstallPromptSubscriber>()
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null

// `beforeinstallprompt` se dispara una sola vez por carga y puede ocurrir antes
// de que el componente monte: se captura a nivel de módulo desde la importación.
function handleBeforeInstallPrompt(event: Event): void {
  event.preventDefault()
  const promptEvent = event as BeforeInstallPromptEvent
  deferredInstallPrompt = promptEvent
  subscribers.forEach((subscriber) => subscriber(promptEvent))
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
}

/** Detección de app instalada: modo standalone (incluye iOS) o pantalla completa. */
function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false

  // iOS expone `navigator.standalone` en vez de `display-mode: standalone`.
  const nav = window.navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return true

  if (typeof window.matchMedia !== 'function') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches
  )
}

function wasInstalled(): boolean {
  return detectStandalone()
}

/** Solo para tests: limpia el estado a nivel de módulo. */
export function resetInstallPromptForTests(): void {
  deferredInstallPrompt = null
}

interface InstallPromptProps {
  /** `dark` pinta los iconos negros para fondos claros. */
  variant?: 'default' | 'dark'
  /** `compact` reduce los iconos y permite que la fila haga wrap (menús laterales). */
  size?: 'default' | 'compact'
}

export function InstallPrompt({
  variant = 'default',
  size = 'default'
}: InstallPromptProps) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    deferredInstallPrompt
  )
  const [installed, setInstalled] = useState(wasInstalled)
  const [helpFor, setHelpFor] = useState<InstallPlatform | null>(null)
  const prompting = useRef(false)

  const markInstalled = useCallback(() => {
    deferredInstallPrompt = null
    setDeferred(null)
    setInstalled(true)
  }, [])

  useEffect(() => {
    function onBeforeInstall(event: BeforeInstallPromptEvent) {
      setDeferred(event)
    }
    subscribers.add(onBeforeInstall)
    window.addEventListener('appinstalled', markInstalled)

    // Si el usuario pasa a modo standalone (abre la app instalada), ocultar.
    const mql =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(display-mode: standalone)')
        : null
    const onDisplayModeChange = () => {
      if (detectStandalone()) markInstalled()
    }
    mql?.addEventListener?.('change', onDisplayModeChange)

    return () => {
      subscribers.delete(onBeforeInstall)
      window.removeEventListener('appinstalled', markInstalled)
      mql?.removeEventListener?.('change', onDisplayModeChange)
    }
  }, [markInstalled])

  async function handleAndroidClick(): Promise<void> {
    if (prompting.current) return
    if (!deferred) {
      // Sin prompt nativo disponible (p. ej. otro navegador): instrucciones.
      setHelpFor('android')
      return
    }
    prompting.current = true
    try {
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice?.outcome === 'accepted') {
        markInstalled()
      } else {
        deferredInstallPrompt = null
        setDeferred(null)
      }
    } catch {
      deferredInstallPrompt = null
      setDeferred(null)
      setHelpFor('android')
    } finally {
      prompting.current = false
    }
  }

  if (installed) return null

  return (
    <>
      <div
        className={`${styles.row} ${variant === 'dark' ? styles.dark : ''} ${
          size === 'compact' ? styles.compact : ''
        }`}
      >
        <button
          type="button"
          className={styles.button}
          aria-label="Instalar en Android"
          onClick={() => {
            void handleAndroidClick()
          }}
        >
          <img className={styles.image} src="/app-android.png" alt="" />
        </button>
        <button
          type="button"
          className={styles.button}
          aria-label="Instalar en iPhone o iPad"
          onClick={() => setHelpFor('apple')}
        >
          <img className={styles.image} src="/app-apple.png" alt="" />
        </button>
      </div>
      {helpFor && (
        <InstallHelpModal platform={helpFor} onClose={() => setHelpFor(null)} />
      )}
    </>
  )
}
