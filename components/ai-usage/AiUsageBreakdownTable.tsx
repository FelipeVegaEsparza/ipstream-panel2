'use client'

import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import type { DashboardTranslationKey } from '@/lib/dashboard-i18n'
import type { AiUsageFeatureKey, AiUsageFeatureUsage } from '@/lib/ai-usage'
import { formatAiMusic, formatAiNumber } from '@/lib/ai-usage-format'

interface Props {
  rows: AiUsageFeatureUsage[]
}

const FEATURE_LABELS: Record<AiUsageFeatureKey, DashboardTranslationKey> = {
  'live-locution': 'aiUsage.feature.live-locution',
  'live-announce': 'aiUsage.feature.live-announce',
  'autodj-presenter': 'aiUsage.feature.autodj-presenter',
  'ai-capsule': 'aiUsage.feature.ai-capsule',
  'ai-jingle': 'aiUsage.feature.ai-jingle',
  unattributed: 'aiUsage.feature.unattributed',
}

export function AiUsageBreakdownTable({ rows }: Props) {
  const { t, locale } = useDashboardI18n()
  const empty = rows.every((row) => row.characters === 0 && row.musicSeconds === 0)

  if (empty) {
    return <p className="text-sm text-muted-foreground">{t('aiUsage.noConsumption')}</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="pb-2 pr-3 font-medium">{t('aiUsage.function')}</th>
            <th className="pb-2 pr-3 text-right font-medium">{t('aiUsage.characters')}</th>
            <th className="pb-2 text-right font-medium">{t('aiUsage.music')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.feature}
              className={
                row.feature === 'unattributed'
                  ? 'border-b border-border/60 text-muted-foreground'
                  : 'border-b border-border/60 text-foreground'
              }
            >
              <td className="py-2 pr-3">{t(FEATURE_LABELS[row.feature])}</td>
              <td className="py-2 pr-3 text-right font-mono">
                {formatAiNumber(row.characters, locale)}
              </td>
              <td className="py-2 text-right font-mono">
                {formatAiMusic(row.musicSeconds)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
