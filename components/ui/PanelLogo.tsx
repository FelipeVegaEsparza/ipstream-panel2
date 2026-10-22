'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/components/providers/ThemeProvider'

const DEFAULT_LOGO_LIGHT = '/logo-casterfly.png'
const DEFAULT_LOGO_DARK = '/logo-casterfly-dark.png'

interface Branding {
  logoDarkUrl: string | null
  logoLightUrl: string | null
}

export function PanelLogo({
  className = '',
  alt = 'CasterFly',
  themeOverride,
}: {
  className?: string
  alt?: string
  themeOverride?: 'dark' | 'light'
}) {
  const { theme: activeTheme } = useTheme()
  const theme = themeOverride ?? activeTheme
  const [branding, setBranding] = useState<Branding | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () => {
      fetch('/api/panel-branding', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!cancelled && data) {
            setBranding({
              logoDarkUrl: typeof data.logoDarkUrl === 'string' ? data.logoDarkUrl : null,
              logoLightUrl: typeof data.logoLightUrl === 'string' ? data.logoLightUrl : null,
            })
          }
        })
        .catch(() => {})
    }
    load()
    window.addEventListener('panel-branding-updated', load)
    return () => {
      cancelled = true
      window.removeEventListener('panel-branding-updated', load)
    }
  }, [])

  const src = theme === 'dark'
    ? branding?.logoDarkUrl || branding?.logoLightUrl || DEFAULT_LOGO_DARK
    : branding?.logoLightUrl || branding?.logoDarkUrl || DEFAULT_LOGO_LIGHT

  return <img src={src} alt={alt} className={className} />
}
