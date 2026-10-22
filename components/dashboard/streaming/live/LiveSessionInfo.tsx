'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDaysIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { useStreamingStatus } from '@/lib/useStreamingStatus'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

function safeTimeZone(timeZone?: string | null): string | undefined {
  if (!timeZone) return undefined
  try {
    new Intl.DateTimeFormat('es', { timeZone }).format(new Date())
    return timeZone
  } catch {
    return undefined
  }
}

export function LiveSessionInfo({ timezone, hero = false }: { timezone?: string | null; hero?: boolean }) {
  const { t, locale } = useDashboardI18n()
  const intlLocale = locale === 'en' ? 'en' : 'es'
  const [now, setNow] = useState(() => new Date())
  const { status, loading } = useStreamingStatus({ pollingMs: 5000 })
  const zone = safeTimeZone(timezone)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const date = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(intlLocale, {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: zone,
      }).format(now)
    } catch {
      return now.toLocaleDateString(intlLocale)
    }
  }, [now, zone])

  const time = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(intlLocale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: zone,
      }).format(now)
    } catch {
      return now.toLocaleTimeString(intlLocale)
    }
  }, [now, zone])

  const listeners = status?.icecast?.listeners
  const listenerValue = loading && listeners == null
    ? '—'
    : typeof listeners === 'number'
      ? new Intl.NumberFormat(intlLocale).format(listeners)
      : '—'
  const isLive = Boolean(status?.dj?.connected || status?.db?.status === 'live')

  if (hero) {
    return (
      <section className="grid shrink-0 gap-2 rounded-lg border border-border bg-card p-2 shadow-soft sm:grid-cols-[minmax(220px,1.2fr)_minmax(0,1fr)_minmax(180px,0.9fr)]">
        <div className="flex min-w-0 items-center gap-3 rounded-md border border-border/70 bg-background/50 px-3 py-1.5">
          <ClockIcon className="h-5 w-5 shrink-0 text-brand" />
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{t('live.session.localTime')}</p>
            <p className="font-mono text-3xl font-semibold leading-tight tabular-nums text-foreground">{time}</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3 rounded-md border border-border/70 bg-background/50 px-3 py-1.5">
          <CalendarDaysIcon className="h-5 w-5 shrink-0 text-brand" />
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{t('live.session.date')}</p>
            <p className="truncate text-sm font-medium capitalize text-foreground">{date}</p>
            {zone && <p className="truncate text-[9px] text-muted-foreground">{zone}</p>}
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3 rounded-md border border-border/70 bg-background/50 px-3 py-1.5">
          <UserGroupIcon className="h-5 w-5 shrink-0 text-brand" />
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{t('live.session.connectedNow')}</p>
            <p className="flex items-center gap-2 text-2xl font-semibold leading-tight tabular-nums text-foreground">
              {listenerValue}
              <span className="text-[10px] font-normal text-muted-foreground">
                {listeners === 1 ? t('live.session.person') : t('live.session.people')}
              </span>
              {isLive && <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />}
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="grid shrink-0 gap-2 rounded-lg border border-border bg-card px-3 py-2.5 shadow-soft sm:grid-cols-3">
      <div className="flex items-center gap-2">
        <CalendarDaysIcon className="h-4 w-4 shrink-0 text-brand" />
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{t('live.session.date')}</p>
          <p className="truncate text-[12px] font-medium capitalize text-foreground">{date}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ClockIcon className="h-4 w-4 shrink-0 text-brand" />
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{t('live.session.time')}</p>
          <p className="font-mono text-[12px] font-medium tabular-nums text-foreground">{time}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <UserGroupIcon className="h-4 w-4 shrink-0 text-brand" />
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('live.session.connectedNow')}
          </p>
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
            <span>{listenerValue}</span>
            <span className="text-[10px] font-normal text-muted-foreground">
              {listeners === 1 ? t('live.session.person') : t('live.session.people')}
            </span>
            {isLive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />}
          </p>
        </div>
      </div>
    </section>
  )
}
