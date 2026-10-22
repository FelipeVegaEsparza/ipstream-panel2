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

export function AiCreditsCard({ limit, used, remaining, period, compact = false }: Props) {
  const { t, locale } = useDashboardI18n()
  const numberLocale = locale === 'en' ? 'en-US' : 'es-CL'
  if (limit <= 0) return null
  const percent = Math.min(100, Math.round((used / limit) * 100))

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-brand/10 p-2 text-brand">
            <SparklesIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t('aiCredits.title')}</h2>
            <p className="text-xs text-muted-foreground">
              {t('aiCredits.subtitle', { month: monthLabel(period, locale) })}
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/streaming/locutor-ia"
          className="text-xs font-medium text-brand hover:underline"
        >
          {t('aiCredits.configure')}
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('aiCredits.assigned')}</p>
          <p className="mt-0.5 font-mono text-lg font-semibold text-foreground">
            {limit.toLocaleString(numberLocale)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('aiCredits.used')}</p>
          <p className="mt-0.5 font-mono text-lg font-semibold text-foreground">
            {used.toLocaleString(numberLocale)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('aiCredits.available')}</p>
          <p className="mt-0.5 font-mono text-lg font-semibold text-brand">
            {remaining.toLocaleString(numberLocale)}
          </p>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full ${percent >= 90 ? 'bg-red-400' : 'bg-brand'}`}
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
