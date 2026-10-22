'use client'

import { SparklesIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Props {
  presenterEnabled: boolean
  every: number
  generating: boolean
  error: string | null
  remaining: number
  limit: number
  autoDjPreparing: boolean
  autoDjError: string | null
  onToggle: (enabled: boolean) => void
  onEvery: (every: number) => void
  onOpenComposer: () => void
  onPrepareAutoDj: () => void
}

export function AiPresenterCard({
  presenterEnabled,
  every,
  generating,
  error,
  remaining,
  limit,
  autoDjPreparing,
  autoDjError,
  onToggle,
  onEvery,
  onOpenComposer,
  onPrepareAutoDj,
}: Props) {
  const { t, locale } = useDashboardI18n()
  return (
    <aside className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <SparklesIcon className="h-4 w-4 text-brand" />
          <h2 className="text-sm font-semibold text-foreground">{t('live.presenter.title')}</h2>
        </div>
        <input
          type="checkbox"
          checked={presenterEnabled}
          onChange={(event) => onToggle(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border bg-secondary"
          aria-label={t('live.presenter.toggle')}
        />
      </div>

      <p className="text-[10px] leading-snug text-muted-foreground">
        {t('live.presenter.subtitle')}
      </p>

      <label className="space-y-1">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('live.presenter.every')}</span>
        <select
          value={every}
          onChange={(event) => onEvery(Number(event.target.value))}
          disabled={!presenterEnabled}
          className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none focus:border-brand disabled:opacity-40"
          aria-label={t('live.presenter.every')}
        >
          {[2, 3, 4, 5, 6].map((value) => (
            <option key={value} value={value}>
              {t('live.presenter.everyTracks', { count: value })}
            </option>
          ))}
        </select>
      </label>

      <div className="rounded-lg bg-secondary/60 px-2 py-1.5 text-[10px] leading-snug text-muted-foreground">
        {generating
          ? t('live.presenter.generating')
          : presenterEnabled
            ? t('live.presenter.everyNote', { count: every })
            : t('live.presenter.off')}
      </div>

      <button
        type="button"
        onClick={onOpenComposer}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
      >
        <PencilSquareIcon className="h-3.5 w-3.5" />
        {t('live.presenter.createFree')}
      </button>

      <button
        type="button"
        onClick={onPrepareAutoDj}
        disabled={autoDjPreparing}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-[11px] font-medium text-brand transition-colors hover:bg-brand/20 disabled:opacity-50"
        title={t('live.presenter.applyAutoDj')}
      >
        <SparklesIcon className="h-3.5 w-3.5" />
        {autoDjPreparing ? t('live.presenter.preparing') : t('live.presenter.applyAutoDj')}
      </button>

      {error && <p className="text-[10px] leading-snug text-red-300">{error}</p>}
      {autoDjError && <p className="text-[10px] leading-snug text-red-300">{autoDjError}</p>}

      <p className="mt-auto pt-1 text-[9px] leading-snug text-muted-foreground">
        {t('live.presenter.quota', { remaining: remaining.toLocaleString(locale === 'en' ? 'en-US' : 'es-CL'), limit: limit.toLocaleString(locale === 'en' ? 'en-US' : 'es-CL') })}
        <br />
        {t('live.presenter.note')}
      </p>
    </aside>
  )
}
