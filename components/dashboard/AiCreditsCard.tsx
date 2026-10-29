'use client'

import Link from 'next/link'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Props {
  limit: number
  used: number
  remaining: number
  period: string
  compact?: boolean
  hasActivePacks?: boolean
  embedded?: boolean
}

function monthLabel(period: string, locale: 'es' | 'en'): string {
  try {
    return new Date(`${period}-01T00:00:00Z`).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-CL', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
  } catch {
    return period
  }
}

export function AiCreditsCard({ limit, used, remaining, period, compact = false, hasActivePacks = false, embedded = false }: Props) {
  const { t, locale } = useDashboardI18n()
  const numberLocale = locale === 'en' ? 'en-US' : 'es-CL'
  if (limit <= 0) return null
  const percent = Math.min(100, Math.round((used / limit) * 100))

  return (
    <section className={embedded ? "border-t border-line px-4 py-3.5" : "rounded-panel border border-line bg-card p-4"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-[6px] border border-line bg-surface-3 p-1.5 text-muted-foreground">
            <SparklesIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-[13px] font-medium text-foreground">{t('aiCredits.title')}</h2>
            <p className="text-[11px] text-muted-foreground">
              {t('aiCredits.subtitle', { month: monthLabel(period, locale) })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/consumo-ia"
            className="text-[11px] font-medium text-signal hover:underline"
          >
            {remaining <= 0 && hasActivePacks
              ? t('aiCredits.buyMore')
              : t('aiCredits.viewDetail')}
          </Link>
          <Link
            href="/dashboard/streaming/locutor-ia"
            className="text-[11px] font-medium text-signal hover:underline"
          >
            {t('aiCredits.configure')}
          </Link>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('aiCredits.assigned')}</p>
          <p className="dashboard-metric mt-0.5 text-base font-medium text-foreground">
            {limit.toLocaleString(numberLocale)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('aiCredits.used')}</p>
          <p className="dashboard-metric mt-0.5 text-base font-medium text-foreground">
            {used.toLocaleString(numberLocale)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('aiCredits.available')}</p>
          <p className="dashboard-metric mt-0.5 text-base font-medium text-signal">
            {remaining.toLocaleString(numberLocale)}
          </p>
        </div>
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-3">
        <div
          className={`h-full rounded-full ${percent >= 90 ? 'bg-[color:var(--danger)]' : 'bg-[color:var(--signal)]'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {!compact && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t('aiCredits.cacheNote')}
        </p>
      )}
    </section>
  )
}
