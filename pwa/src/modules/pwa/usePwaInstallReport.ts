import { useEffect } from 'react'
import { ensureInstallReported, isStandaloneApp } from './register'

/**
 * Reporta al panel que el dispositivo tiene la PWA instalada. Se dispara si la
 * app corre en modo standalone al cargar, o cuando se emite `appinstalled`
 * (Android/desktop). No reporta si solo se usa desde el navegador.
 */
export function usePwaInstallReport(clientId: string): void {
  useEffect(() => {
    if (!clientId) return

    const report = () => {
      void ensureInstallReported(clientId)
    }

    if (isStandaloneApp()) report()
    window.addEventListener('appinstalled', report)

    return () => window.removeEventListener('appinstalled', report)
  }, [clientId])
}
