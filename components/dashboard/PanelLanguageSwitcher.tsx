'use client'

import { Fragment } from 'react'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

export function PanelLanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, pending } = useDashboardI18n()

  return (
    <div
      className={`inline-flex items-center ${compact ? 'gap-1' : 'gap-1.5'} text-[10px] font-medium`}
      role="group"
      aria-label={locale === 'en' ? 'Change language' : 'Cambiar idioma'}
    >
      {(['es', 'en'] as const).map((value, index) => {
        const active = locale === value
        return (
          <Fragment key={value}>
            {index > 0 && <span className="text-muted-foreground/30">/</span>}
            <button
              type="button"
              onClick={() => setLocale(value)}
              disabled={pending || active}
              className={`transition-colors ${
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-label={value === 'es' ? 'Español' : 'English'}
              aria-pressed={active}
              title={value === 'es' ? 'Español' : 'English'}
            >
              {value.toUpperCase()}
            </button>
          </Fragment>
        )
      })}
    </div>
  )
}
