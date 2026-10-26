'use client'

import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import type { AdminAiUsageOverview } from '@/lib/ai-usage'
import { formatAiMusic, formatAiNumber, formatAiPeriod } from '@/lib/ai-usage-format'
import { AiUsageBreakdownTable } from '@/components/ai-usage/AiUsageBreakdownTable'
import { AiUsageHistoryTable } from '@/components/ai-usage/AiUsageHistoryTable'

interface Props {
  data: AdminAiUsageOverview
}

export function AdminAiUsageView({ data }: Props) {
  const { t, locale } = useDashboardI18n()

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <section className="card p-5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {t('aiUsage.charactersUsed')}
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-foreground">
            {formatAiNumber(data.current.characters, locale)}
          </p>
          <p className="mt-1 text-[11px] capitalize text-muted-foreground">
            {formatAiPeriod(data.currentPeriod, locale)}
          </p>
        </section>
        <section className="card p-5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {t('aiUsage.musicUsed')}
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-foreground">
            {formatAiMusic(data.current.musicSeconds)}
          </p>
          <p className="mt-1 text-[11px] capitalize text-muted-foreground">
            {formatAiPeriod(data.currentPeriod, locale)}
          </p>
        </section>
        <section className="card p-5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {t('aiUsage.activeClients')}
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-brand">
            {formatAiNumber(data.clients.length, locale)}
          </p>
          <p className="mt-1 text-[11px] capitalize text-muted-foreground">
            {formatAiPeriod(data.currentPeriod, locale)}
          </p>
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
        <h2 className="text-lg font-semibold text-foreground">{t('aiUsage.clientsTitle')}</h2>
        {data.clients.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t('aiUsage.noClients')}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">{t('aiUsage.client')}</th>
                  <th className="pb-2 pr-3 text-right font-medium">{t('aiUsage.characters')}</th>
                  <th className="pb-2 text-right font-medium">{t('aiUsage.music')}</th>
                </tr>
              </thead>
              <tbody>
                {data.clients.map((client) => (
                  <tr key={client.clientId} className="border-b border-border/60 text-foreground">
                    <td className="py-2 pr-3">{client.name}</td>
                    <td className="py-2 pr-3 text-right font-mono">
                      {formatAiNumber(client.characters, locale)}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {formatAiMusic(client.musicSeconds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
