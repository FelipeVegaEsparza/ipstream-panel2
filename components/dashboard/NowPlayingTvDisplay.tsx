'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface TvStatus {
  status: string // "off" | "autodj" | "live"
  streamKey: string
  viewers?: number
  encoder: { status: string; startedAt: string | null; currentTrack: string | null }
  dj: { active: boolean; streamKey: string | null; connectedAt: string | null }
}

function formatDuration(startedAt: string | null | undefined): string | null {
  if (!startedAt) return null
  const ts = new Date(startedAt).getTime()
  if (isNaN(ts)) return null
  const elapsed = Math.floor((Date.now() - ts) / 1000)
  if (elapsed < 60) return `${elapsed}s`
  if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  return `${h}h ${m}m`
}

export function NowPlayingTvDisplay() {
  const { t } = useDashboardI18n()
  const [status, setStatus] = useState<TvStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/dashboard/television/status', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (active) setStatus(data)
        }
      } catch {
        // silencioso
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchStatus()
    const id = setInterval(fetchStatus, 5000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  if (loading && !status) {
    return (
      <div className="p-4 sm:p-5">
        <div className="h-4 w-20 animate-pulse rounded bg-surface-3" />
        <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
          <div className="h-10 w-10 rounded-[6px] bg-surface-3" />
          <div className="flex-1 space-y-2">
            <div className="h-2.5 w-16 rounded bg-surface-3" />
            <div className="h-3.5 w-1/2 rounded bg-surface-3" />
          </div>
        </div>
      </div>
    )
  }

  if (!status) return null

  const isLive = status.dj?.active || status.status === 'live'
  const isRunning = status.status !== 'off'
  const currentTrack = status.encoder?.currentTrack
  const duration = formatDuration(status.encoder?.startedAt)
  const djDuration = formatDuration(status.dj?.connectedAt)
  const viewers = status.viewers ?? 0

  return (
    <div className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-[color:var(--live)]' : isRunning ? 'bg-[color:var(--signal)]' : 'bg-[color:var(--text-3)]'}`} />
          <span className="text-[13px] font-medium text-foreground">{t('nowPlaying.tv')}</span>
          <span className="text-xs text-muted-foreground">
            {isLive ? t('nowPlaying.tvLive') : isRunning ? t('nowPlaying.tvAutodj') : t('nowPlaying.tvOff')}
          </span>
          {isRunning && (
            <span className="dashboard-metric text-[11px] text-muted-foreground">
              {viewers} {t('nowPlaying.viewers')}
            </span>
          )}
          {isRunning && (isLive ? djDuration : duration) && (
            <span className="dashboard-metric hidden text-[11px] text-muted-foreground sm:inline">
              {isLive ? djDuration : duration}
            </span>
          )}
        </div>
        <Link href="/dashboard/television" className="text-xs font-medium text-signal hover:underline">
          {t('nowPlaying.openTvConsole')}
        </Link>
      </div>

      {!isRunning ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <p className="text-xs text-muted-foreground">{t('nowPlaying.tvOffHint')}</p>
          <Link href="/dashboard/television" className="text-xs font-medium text-signal hover:underline">
            {t('nowPlaying.startStreaming')}
          </Link>
        </div>
      ) : (
        <div className="mt-3 flex min-w-0 items-center gap-3 border-t border-line pt-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-line bg-surface-3">
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zm6 2h-2m-2 0h2" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="dashboard-label mb-1">{t('nowPlaying.tvNow')}</div>
            <p className="truncate text-[13px] font-medium text-foreground">
              {currentTrack || (isLive ? t('nowPlaying.liveNow') : t('nowPlaying.tvStarting'))}
            </p>
            {isLive && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{t('nowPlaying.tvLiveSignal')}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
