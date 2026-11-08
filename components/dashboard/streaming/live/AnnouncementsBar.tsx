'use client'

import { ClockIcon, CloudIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import type { AnnouncementType } from '@/lib/live-console/use-live-console'
import { createAnnouncementTrack } from '@/lib/live-console/announcements'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Props {
  loading: AnnouncementType | null
  error: string | null
  freeFormAvailable?: boolean
  onAddToQueue: (type: AnnouncementType) => void
  onOpenComposer?: () => void
  compact?: boolean
}

export function AnnouncementsBar({
  loading,
  error,
  freeFormAvailable = false,
  onAddToQueue,
  onOpenComposer,
  compact = false,
}: Props) {
  const { t } = useDashboardI18n()
  const busy = loading != null

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onAddToQueue('weather')}
          onDragStart={(event) => {
            event.dataTransfer.setData('application/x-ipstream-track', JSON.stringify(createAnnouncementTrack('weather')))
            event.dataTransfer.effectAllowed = 'copy'
          }}
          draggable
          disabled={busy}
          className="cursor-grab rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-surface-3 active:cursor-grabbing disabled:opacity-40"
          title={t('live.announce.dragWeather')}
        >
          {t('live.announce.weather')}
        </button>
        <button
          type="button"
          onClick={() => onAddToQueue('time')}
          onDragStart={(event) => {
            event.dataTransfer.setData('application/x-ipstream-track', JSON.stringify(createAnnouncementTrack('time')))
            event.dataTransfer.effectAllowed = 'copy'
          }}
          draggable
          disabled={busy}
          className="cursor-grab rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-surface-3 active:cursor-grabbing disabled:opacity-40"
          title={t('live.announce.dragTime')}
        >
          {t('live.announce.time')}
        </button>
        {freeFormAvailable && onOpenComposer && (
          <button
            type="button"
            onClick={onOpenComposer}
            disabled={busy}
            className="rounded-lg border border-[color:var(--signal)]/40 bg-[color:var(--signal)]/10 px-2.5 py-1.5 text-[11px] font-medium text-signal transition-colors hover:bg-[color:var(--signal)]/20 disabled:opacity-40"
            title={t('live.announce.createFree')}
          >
            {t('live.announce.free')}
          </button>
        )}
        {loading && (
          <span className="text-[10px] text-muted-foreground">
            {t('live.announce.generatingShort')}
          </span>
        )}
        {error && <span className="text-[10px] text-[color:var(--danger)]">{error}</span>}
      </div>
    )
  }

  return (
  <aside className="flex min-h-[180px] flex-col rounded-panel border border-border bg-card p-3 ">
      <h2 className="text-sm font-semibold text-foreground">{t('live.announce.title')}</h2>
      <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
        {t('live.announce.subtitle')}
      </p>

      <div className="mt-3 space-y-2">
        <button
          type="button"
          onClick={() => onAddToQueue('weather')}
          onDragStart={(event) => {
            event.dataTransfer.setData('application/x-ipstream-track', JSON.stringify(createAnnouncementTrack('weather')))
            event.dataTransfer.effectAllowed = 'copy'
          }}
          draggable
          disabled={busy}
          className="flex w-full cursor-grab items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-[11px] font-medium text-foreground transition-colors hover:text-brand active:cursor-grabbing disabled:opacity-40"
          title={t('live.announce.dragWeather')}
        >
          <CloudIcon className="h-3.5 w-3.5" />
          {t('live.announce.weather')}
        </button>
        <button
          type="button"
          onClick={() => onAddToQueue('time')}
          onDragStart={(event) => {
            event.dataTransfer.setData('application/x-ipstream-track', JSON.stringify(createAnnouncementTrack('time')))
            event.dataTransfer.effectAllowed = 'copy'
          }}
          draggable
          disabled={busy}
          className="flex w-full cursor-grab items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-[11px] font-medium text-foreground transition-colors hover:text-brand active:cursor-grabbing disabled:opacity-40"
          title={t('live.announce.dragTime')}
        >
          <ClockIcon className="h-3.5 w-3.5" />
          {t('live.announce.time')}
        </button>
        {freeFormAvailable && onOpenComposer && (
          <button
            type="button"
            onClick={onOpenComposer}
            disabled={busy}
            className="flex w-full items-center gap-1.5 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-[11px] font-medium text-brand transition-colors hover:bg-brand/20 disabled:opacity-40"
            title={t('live.announce.createFree')}
          >
            <PencilSquareIcon className="h-3.5 w-3.5" />
            {t('live.announce.free')}
          </button>
        )}
      </div>

      {loading && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          {t('live.announce.generating', { type: loading === 'weather' ? t('live.announce.weatherLower') : t('live.announce.timeLower') })}
        </p>
      )}
      {error && <p className="mt-2 text-[10px] text-red-300">{error}</p>}

      <p className="mt-auto pt-3 text-[9px] leading-snug text-muted-foreground">
        {t('live.announce.footer')}
      </p>
    </aside>
  )
}
