import { useEffect } from 'react'
import { deriveAccent } from '@/core/color'

const TOKENS = [
  '--brand-accent',
  '--brand-accent-hover',
  '--brand-accent-rgb',
  '--brand-accent-soft',
  '--brand-accent-contrast',
  '--brand-accent-on'
] as const

function clearTokens(root: HTMLElement): void {
  for (const token of TOKENS) root.style.removeProperty(token)
}

/**
 * Aplica el color de acento del cliente como variables CSS en `:root`, de modo
 * que los templates lo consuman en runtime. Sin color (o con un valor inválido)
 * no setea nada y los templates usan su propio acento.
 */
export function useAccentTheme(
  accentColor: string | null | undefined
): void {
  useEffect(() => {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    const tokens = accentColor ? deriveAccent(accentColor) : null

    if (!tokens) {
      clearTokens(root)
      return
    }

    root.style.setProperty('--brand-accent', tokens.accent)
    root.style.setProperty('--brand-accent-hover', tokens.hover)
    root.style.setProperty('--brand-accent-rgb', tokens.rgb)
    root.style.setProperty('--brand-accent-soft', tokens.soft)
    root.style.setProperty('--brand-accent-contrast', tokens.contrast)
    // Flag para activar refuerzos de "protagonismo" solo cuando hay acento.
    root.style.setProperty('--brand-accent-on', '1')

    return () => clearTokens(root)
  }, [accentColor])
}
