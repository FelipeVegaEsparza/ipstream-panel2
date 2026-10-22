'use client'

import { createContext, useCallback, useContext, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  DASHBOARD_LOCALE_COOKIE,
  dashboardT,
  type DashboardLocale,
  type DashboardTranslationKey,
} from '@/lib/dashboard-i18n'

interface DashboardI18nContextValue {
  locale: DashboardLocale
  t: (key: DashboardTranslationKey, vars?: Record<string, string | number>) => string
  setLocale: (locale: DashboardLocale) => void
  pending: boolean
}

const DashboardI18nContext = createContext<DashboardI18nContextValue | null>(null)

export function DashboardI18nProvider({
  locale,
  children,
}: {
  locale: DashboardLocale
  children: ReactNode
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const t = dashboardT(locale)

  const setLocale = useCallback(
    (nextLocale: DashboardLocale) => {
      const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; secure' : ''
      document.cookie = `${DASHBOARD_LOCALE_COOKIE}=${nextLocale}; path=/; max-age=31536000; samesite=lax${secure}`
      startTransition(() => router.refresh())
    },
    [router]
  )

  return (
    <DashboardI18nContext.Provider value={{ locale, t, setLocale, pending }}>
      {children}
    </DashboardI18nContext.Provider>
  )
}

export function useDashboardI18n(): DashboardI18nContextValue {
  const context = useContext(DashboardI18nContext)
  if (!context) {
    throw new Error('useDashboardI18n must be used inside DashboardI18nProvider')
  }
  return context
}
