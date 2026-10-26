'use client'

import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import type { AiUsageMonth } from '@/lib/ai-usage'
import { formatAiMusic, formatAiNumber, formatAiPeriod } from '@/lib/ai-usage-format'

interface Props {
  rows: AiUsageMonth[]
}

export function AiUsageHistoryTable({ rows }: Props) {
  const { t, locale } = useDashboardI18n()

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="pb-2 pr-3 font-medium">{t('aiUsage.month')}</th>
            <th className="pb-2 pr-3 text-right font-medium">{t('aiUsage.characters')}</th>
            <th className="pb-2 text-right font-medium">{t('aiUsage.music')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.period} className="border-b border-border/60 text-foreground">
              <td className="py-2 pr-3 capitalize">{formatAiPeriod(row.period, locale)}</td>
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
