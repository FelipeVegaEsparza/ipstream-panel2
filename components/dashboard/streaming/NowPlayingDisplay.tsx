'use client'

import Link from 'next/link'
import { useStreamingStatus } from '@/lib/useStreamingStatus'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

function formatDuration(startTimestamp: number): string {
  const elapsed = Math.floor((Date.now() - startTimestamp) / 1000)
  if (elapsed < 60) return `${elapsed}s`
  if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  return `${h}h ${m}m`
}

function parseAndFormatDuration(startedAt: string | number | null | undefined): string | null {
  if (!startedAt) return null
  const ts = typeof startedAt === 'number' ? startedAt : new Date(startedAt).getTime()
  if (isNaN(ts)) return null
  return formatDuration(ts)
}

function TrackRow(props: {
  track: { title: string; artist?: string | null; coverUrl?: string | null; isJingle?: boolean } | null
  label: string
}) {
  const { t } = useDashboardI18n()
  const track = props.track

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-[6px] border border-line bg-surface-3">
        {track?.coverUrl ? (
          <img
            src={track.coverUrl}
            alt={track.title || t('nowPlaying.cover')}
            className="h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="dashboard-label mb-1">{props.label}</div>
        {track ? (
          <>
            <div className="flex items-center gap-2">
              <p className="truncate text-[13px] font-medium text-foreground">{track.title || t('nowPlaying.noTitle')}</p>
              {track.isJingle && (
                <span className="shrink-0 rounded border border-amber-500/30 bg-amber-500/10 px-1 py-0.5 text-[9px] font-medium uppercase text-amber-300">
                  Jingle
                </span>
              )}
            </div>
            {track.artist && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{track.artist}</p>}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">{t('nowPlaying.waiting')}</p>
        )}
      </div>
    </div>
  )
}

export function NowPlayingDisplay() {
  const { t } = useDashboardI18n()
  const { status, loading } = useStreamingStatus({ pollingMs: 5000 })

  if (loading && !status) {
    return (
      <div className="p-4 sm:p-5">
        <div className="h-4 w-24 animate-pulse rounded bg-surface-3" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-[6px] bg-surface-3" />
              <div className="flex-1 space-y-2">
                <div className="h-2.5 w-16 rounded bg-surface-3" />
                <div className="h-3.5 w-3/4 rounded bg-surface-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!status) return null

  const running = Boolean(status.process?.running)
  const listeners = status.icecast?.listeners ?? 0
  const isDjLive = Boolean(status.dj?.connected)
  const djDuration = parseAndFormatDuration(status.dj?.connectedAt)
  const autodjDuration = parseAndFormatDuration(status.process?.startedAt)
  const nowPlaying = status.nowPlaying
  const current = nowPlaying?.currentTrack
  const next = nowPlaying?.nextTrack

  return (
    <div className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span className={`h-1.5 w-1.5 rounded-full ${running ? 'bg-[color:var(--live)]' : 'bg-[color:var(--text-3)]'}`} />
          <span className="text-[13px] font-medium text-foreground">{t('nowPlaying.radio')}</span>
          <span className="text-xs text-muted-foreground">
            {running
              ? isDjLive
                ? t('nowPlaying.live')
                : t('nowPlaying.autodj')
              : t('nowPlaying.radioOff')}
          </span>
          {running && (
            <>
              <span className="dashboard-metric text-[11px] text-muted-foreground">
                {listeners} {t('nowPlaying.listeners')}
              </span>
              {(isDjLive ? djDuration : autodjDuration) && (
                <span className="dashboard-metric hidden text-[11px] text-muted-foreground sm:inline">
                  {isDjLive ? djDuration : autodjDuration}
                </span>
              )}
            </>
          )}
        </div>
        <Link href="/dashboard/streaming" className="text-xs font-medium text-signal hover:underline">
          {t('nowPlaying.openConsole')}
        </Link>
      </div>

      {!running ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <p className="text-xs text-muted-foreground">{t('nowPlaying.radioOffHint')}</p>
          <Link href="/dashboard/streaming" className="text-xs font-medium text-signal hover:underline">
            {t('nowPlaying.startStreaming')}
          </Link>
        </div>
      ) : (
        <>
          {nowPlaying?.playlist && !isDjLive && (
            <p className="mt-2 truncate text-[11px] text-muted-foreground">
              {t('nowPlaying.playlist')}: <span className="text-foreground">{nowPlaying.playlist.name}</span>
            </p>
          )}
          <div className="mt-3 grid gap-4 border-t border-line pt-3 sm:grid-cols-2">
            <TrackRow track={current ?? null} label={t('nowPlaying.nowPlaying')} />
            <TrackRow track={next ?? null} label={t('nowPlaying.next')} />
          </div>
          {isDjLive && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              {status.dj?.name ? `${status.dj.name} · ` : ''}{t('nowPlaying.autodjAfterDj')}
            </p>
          )}
        </>
      )}
    </div>
  )
}
