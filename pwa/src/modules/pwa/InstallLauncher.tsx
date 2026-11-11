import { useEffect, useState } from 'react'
import { FaDownload } from 'react-icons/fa6'
import { InstallHelpModal, type InstallPlatform } from './InstallHelpModal'
import {
  detectInstalledApp,
  getDeferredInstallPrompt,
  promptInstall,
  subscribeDeferredInstallPrompt
} from './InstallPrompt'
import styles from './InstallLauncher.module.css'

/** iOS/iPadOS no expone `beforeinstallprompt`: se muestran instrucciones. */
function detectPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'android'
  const ua = navigator.userAgent
  const isIPad =
    /iPad/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1)
  return /iPhone|iPod/.test(ua) || isIPad ? 'apple' : 'android'
}

interface InstallLauncherProps {
  /** Si el chat en vivo está visible, el lanzador se apila debajo. */
  withChat?: boolean
}

/**
 * Botón flotante para instalar la PWA. Replica el estilo del lanzador de
 * "Chat en vivo" y se muestra en todos los templates (se monta en App).
 */
export function InstallLauncher({ withChat = false }: InstallLauncherProps) {
  const [hasPrompt, setHasPrompt] = useState(() =>
    Boolean(getDeferredInstallPrompt())
  )
  const [installed, setInstalled] = useState(detectInstalledApp)
  const [helpFor, setHelpFor] = useState<InstallPlatform | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const unsubscribe = subscribeDeferredInstallPrompt((event) =>
      setHasPrompt(Boolean(event))
    )
    // El evento pudo capturarse antes de montar el componente.
    setHasPrompt(Boolean(getDeferredInstallPrompt()))

    const markInstalled = () => setInstalled(true)
    window.addEventListener('appinstalled', markInstalled)

    const mql =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(display-mode: standalone)')
        : null
    const onDisplayModeChange = () => {
      if (detectInstalledApp()) setInstalled(true)
    }
    mql?.addEventListener?.('change', onDisplayModeChange)

    return () => {
      unsubscribe()
      window.removeEventListener('appinstalled', markInstalled)
      mql?.removeEventListener?.('change', onDisplayModeChange)
    }
  }, [])

  if (installed) return null

  const handleClick = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (!hasPrompt) {
        setHelpFor(detectPlatform())
        return
      }
      const outcome = await promptInstall()
      if (outcome === 'accepted') {
        setInstalled(true)
      } else if (outcome === 'unavailable') {
        setHelpFor(detectPlatform())
      } else {
        setHasPrompt(false)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={`${styles.launcher} ${withChat ? styles.withChat : ''}`}
        onClick={() => {
          void handleClick()
        }}
        disabled={busy}
        aria-label="Instalar aplicación"
      >
        <FaDownload aria-hidden="true" />
        <span className={styles.launcherLabel}>Instalar app</span>
      </button>
      {helpFor && (
        <InstallHelpModal platform={helpFor} onClose={() => setHelpFor(null)} />
      )}
    </>
  )
}
