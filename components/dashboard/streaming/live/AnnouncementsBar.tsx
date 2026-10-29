'use client'

import { ClockIcon, CloudIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import type { AnnouncementType, AnnouncementVoice } from '@/lib/live-console/use-live-console'
import { createAnnouncementTrack } from '@/lib/live-console/announcements'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Props {
  loading: AnnouncementType | null
  error: string | null
  voice: AnnouncementVoice
  premiumAvailable?: boolean
  freeFormAvailable?: boolean
  onVoice: (voice: AnnouncementVoice) => void
  onAddToQueue: (type: AnnouncementType) => void
  onOpenComposer?: () => void
}

export function AnnouncementsBar({
  loading,
  error,
  voice,
  premiumAvailable = false,
  freeFormAvailable = false,
  onVoice,
  onAddToQueue,
  onOpenComposer,
}: Props) {
  const { t } = useDashboardI18n()
  const busy = loading != null
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

      <label className="mt-3 space-y-1">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('live.announce.voice')}</span>
        <select
          value={voice}
          onChange={(event) => {
            const value = event.target.value
            onVoice(value === 'premium' || value === 'female' ? value : 'male')
          }}
          className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none focus:border-brand"
          aria-label={t('live.announce.voiceLabel')}
        >
          {premiumAvailable && <option value="premium">{t('live.announce.premiumVoice')}</option>}
          <option value="male">Ald (Piper)</option>
          <option value="female">Claude (Piper)</option>
        </select>
      </label>

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
