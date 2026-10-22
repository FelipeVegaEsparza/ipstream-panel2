'use client'

import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import type { DashboardLocale } from '@/lib/dashboard-i18n'

const FLAGS: Record<DashboardLocale, React.ReactNode> = {
  es: (
    <svg className="h-3.5 w-5 rounded-[2px] shadow-[0_0_0_1px_rgba(255,255,255,0.2)]" viewBox="0 0 24 16" aria-hidden="true">
      <rect width="24" height="16" fill="#fff" />
      <rect y="8" width="24" height="8" fill="#d52b1e" />
      <rect width="8" height="8" fill="#0039a6" />
      <path d="M4 1.4l0.72 1.94 2.06.12-1.63 1.25.53 2.02L4 5.58 2.32 6.73l.53-2.02L1.22 3.46l2.06-.12z" fill="#fff" />
    </svg>
  ),
  en: (
    <svg className="h-3.5 w-5 rounded-[2px] shadow-[0_0_0_1px_rgba(255,255,255,0.2)]" viewBox="0 0 24 16" aria-hidden="true">
      <rect width="24" height="16" fill="#fff" />
      <g fill="#b22234">
        <rect width="24" height="1.23" />
        <rect y="2.46" width="24" height="1.23" />
        <rect y="4.92" width="24" height="1.23" />
        <rect y="7.38" width="24" height="1.23" />
        <rect y="9.84" width="24" height="1.23" />
        <rect y="12.3" width="24" height="1.23" />
        <rect y="14.76" width="24" height="1.23" />
      </g>
      <rect width="10" height="8.6" fill="#3c3b6e" />
      <g fill="#fff">
        <circle cx="2" cy="1.9" r="0.55" />
        <circle cx="5" cy="1.9" r="0.55" />
        <circle cx="8" cy="1.9" r="0.55" />
        <circle cx="3.5" cy="3.7" r="0.55" />
        <circle cx="6.5" cy="3.7" r="0.55" />
        <circle cx="2" cy="5.5" r="0.55" />
        <circle cx="5" cy="5.5" r="0.55" />
        <circle cx="8" cy="5.5" r="0.55" />
        <circle cx="3.5" cy="7.2" r="0.55" />
        <circle cx="6.5" cy="7.2" r="0.55" />
      </g>
    </svg>
  ),
}

export function PanelLanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, pending } = useDashboardI18n()

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-secondary/30 p-0.5"
      role="group"
      aria-label={locale === 'en' ? 'Change language' : 'Cambiar idioma'}
    >
      {(['es', 'en'] as const).map((value) => {
        const active = locale === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => setLocale(value)}
            disabled={pending || active}
            className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-mono text-[10px] tracking-wide transition-colors ${
              active
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-label={value === 'es' ? 'Español' : 'English'}
            aria-pressed={active}
            title={value === 'es' ? 'Español' : 'English'}
          >
            {FLAGS[value]}
            {!compact && <span>{value.toUpperCase()}</span>}
          </button>
        )
      })}
    </div>
  )
}
