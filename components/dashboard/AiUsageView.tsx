'use client'

import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import type { ClientAiUsageOverview } from '@/lib/ai-usage'
import {
  formatAiMusic,
  formatAiNumber,
  formatAiPeriod,
} from '@/lib/ai-usage-format'
import { AiUsageBreakdownTable } from '@/components/ai-usage/AiUsageBreakdownTable'
import { AiUsageHistoryTable } from '@/components/ai-usage/AiUsageHistoryTable'

interface Props {
  data: ClientAiUsageOverview
}

export function AiUsageView({ data }: Props) {
  const { t, locale } = useDashboardI18n()
  const { characters, music } = data.quotas

  const characterPercent =
    characters.limit > 0
      ? Math.min(100, Math.round((characters.used / characters.limit) * 100))
      : 0
  const musicPercent =
    music.limitSeconds > 0
      ? Math.min(100, Math.round((music.usedSeconds / music.limitSeconds) * 100))
      : 0

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-lg font-semibold text-foreground">{t('aiUsage.characters')}</h2>
          {characters.enabled ? (
            <>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t('aiCredits.assigned')}
                  </p>
                  <p className="mt-0.5 font-mono text-lg font-semibold text-foreground">
                    {formatAiNumber(characters.limit, locale)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t('aiCredits.used')}
                  </p>
                  <p className="mt-0.5 font-mono text-lg font-semibold text-foreground">
                    {formatAiNumber(characters.used, locale)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t('aiCredits.available')}
                  </p>
                  <p className="mt-0.5 font-mono text-lg font-semibold text-brand">
                    {formatAiNumber(characters.remaining, locale)}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full ${characterPercent >= 90 ? 'bg-red-400' : 'bg-brand'}`}
                  style={{ width: `${characterPercent}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {formatAiPeriod(data.currentPeriod, locale)}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">{t('aiUsage.notIncluded')}</p>
          )}
        </section>

        <section className="card p-5">
          <h2 className="text-lg font-semibold text-foreground">{t('aiUsage.music')}</h2>
          {music.enabled ? (
            <>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t('aiCredits.assigned')}
                  </p>
                  <p className="mt-0.5 font-mono text-lg font-semibold text-foreground">
                    {formatAiMusic(music.limitSeconds)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t('aiCredits.used')}
                  </p>
                  <p className="mt-0.5 font-mono text-lg font-semibold text-foreground">
                    {formatAiMusic(music.usedSeconds)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t('aiCredits.available')}
                  </p>
                  <p className="mt-0.5 font-mono text-lg font-semibold text-brand">
                    {formatAiMusic(music.remainingSeconds)}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full ${musicPercent >= 90 ? 'bg-red-400' : 'bg-brand'}`}
                  style={{ width: `${musicPercent}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {formatAiPeriod(data.currentPeriod, locale)}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">{t('aiUsage.notIncluded')}</p>
          )}
        </section>
      </div>

      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">{t('aiUsage.breakdownTitle')}</h2>
          <span className="text-xs capitalize text-muted-foreground">
            {formatAiPeriod(data.currentPeriod, locale)}
          </span>
        </div>
        <div className="mt-4">
          <AiUsageBreakdownTable rows={data.current.breakdown} />
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">{t('aiUsage.noDetailNote')}</p>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold text-foreground">{t('aiUsage.historyTitle')}</h2>
        <div className="mt-4">
          <AiUsageHistoryTable rows={data.history} />
        </div>
      </section>
    </div>
  )
}
