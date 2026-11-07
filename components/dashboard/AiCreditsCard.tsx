'use client'

import Link from 'next/link'
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
  const linkLabel = remaining <= 0 && hasActivePacks ? t('aiCredits.buyMore') : t('aiCredits.viewDetail')

  if (embedded) {
    return (
      <div className="border-t border-line px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex min-w-[220px] flex-1 items-center gap-3">
            <span className="whitespace-nowrap text-[11px] font-medium text-muted-foreground">
              {t('aiCredits.title')}
            </span>
            <div className="h-0.5 min-w-[60px] flex-1 bg-surface-3">
              <div
                className={`h-full ${percent >= 90 ? 'bg-[color:var(--danger)]' : 'bg-[color:var(--text-3)]'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="dashboard-metric whitespace-nowrap text-[11px] text-foreground">
              {used.toLocaleString(numberLocale)} / {limit.toLocaleString(numberLocale)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <Link href="/dashboard/consumo-ia" className="font-medium text-signal hover:underline">
              {linkLabel}
            </Link>
            <Link href="/dashboard/streaming/locutor-ia" className="text-muted-foreground hover:text-foreground">
              {t('aiCredits.configure')}
            </Link>
          </div>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {t('aiCredits.subtitle', { month: monthLabel(period, locale) })}
        </p>
      </div>
    )
  }

  return (
    <section className="rounded-panel border border-line bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-medium text-foreground">{t('aiCredits.title')}</h2>
          <p className="text-[11px] text-muted-foreground">
            {t('aiCredits.subtitle', { month: monthLabel(period, locale) })}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <Link href="/dashboard/consumo-ia" className="font-medium text-signal hover:underline">
            {linkLabel}
          </Link>
          <Link href="/dashboard/streaming/locutor-ia" className="text-muted-foreground hover:text-foreground">
            {t('aiCredits.configure')}
          </Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground">{t('aiCredits.assigned')}</p>
          <p className="dashboard-metric mt-0.5 text-base font-medium text-foreground">
            {limit.toLocaleString(numberLocale)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">{t('aiCredits.used')}</p>
          <p className="dashboard-metric mt-0.5 text-base font-medium text-foreground">
            {used.toLocaleString(numberLocale)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">{t('aiCredits.available')}</p>
          <p className="dashboard-metric mt-0.5 text-base font-medium text-foreground">
            {remaining.toLocaleString(numberLocale)}
          </p>
        </div>
      </div>

      <div className="mt-3 h-0.5 overflow-hidden bg-surface-3">
        <div
          className={`h-full ${percent >= 90 ? 'bg-[color:var(--danger)]' : 'bg-[color:var(--text-3)]'}`}
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
