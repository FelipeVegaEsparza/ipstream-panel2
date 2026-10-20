'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDaysIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { useStreamingStatus } from '@/lib/useStreamingStatus'

function safeTimeZone(timeZone?: string | null): string | undefined {
  if (!timeZone) return undefined
  try {
    new Intl.DateTimeFormat('es', { timeZone }).format(new Date())
    return timeZone
  } catch {
    return undefined
  }
}

export function LiveSessionInfo({ timezone }: { timezone?: string | null }) {
  const [now, setNow] = useState(() => new Date())
  const { status, loading } = useStreamingStatus({ pollingMs: 5000 })
  const zone = safeTimeZone(timezone)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const date = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('es', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: zone,
      }).format(now)
    } catch {
      return now.toLocaleDateString('es')
    }
  }, [now, zone])

  const time = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('es', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: zone,
      }).format(now)
    } catch {
      return now.toLocaleTimeString('es')
    }
  }, [now, zone])

  const listeners = status?.icecast?.listeners
  const listenerValue = loading && listeners == null
    ? '—'
    : typeof listeners === 'number'
      ? new Intl.NumberFormat('es').format(listeners)
      : '—'
  const isLive = Boolean(status?.dj?.connected || status?.db?.status === 'live')

  return (
    <section className="grid gap-2 rounded-lg border border-border bg-card px-3 py-2.5 shadow-soft sm:grid-cols-3">
      <div className="flex items-center gap-2">
        <CalendarDaysIcon className="h-4 w-4 shrink-0 text-brand" />
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Fecha</p>
          <p className="truncate text-[12px] font-medium capitalize text-foreground">{date}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ClockIcon className="h-4 w-4 shrink-0 text-brand" />
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Hora</p>
          <p className="font-mono text-[12px] font-medium tabular-nums text-foreground">{time}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <UserGroupIcon className="h-4 w-4 shrink-0 text-brand" />
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Conectados ahora
          </p>
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
            <span>{listenerValue}</span>
            <span className="text-[10px] font-normal text-muted-foreground">
              {listeners === 1 ? 'persona' : 'personas'}
            </span>
            {isLive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />}
          </p>
        </div>
      </div>
    </section>
  )
}
