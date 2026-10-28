'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import { showToast } from '@/components/ui/toast'
import type { ClientAiUsageOverview } from '@/lib/ai-usage'
import { formatAiNumber, formatAiPeriod } from '@/lib/ai-usage-format'
import { shouldShowAiCreditUpsell } from '@/lib/ai-credit-upsell'
import { AiUsageBreakdownTable } from '@/components/ai-usage/AiUsageBreakdownTable'
import { AiUsageHistoryTable } from '@/components/ai-usage/AiUsageHistoryTable'

export interface CreditPackView {
  id: string
  name: string
  description: string | null
  creditType: string
  amount: number
  price: number
  currency: string
}

export interface CreditRequestView {
  id: string
  packId: string
  status: string
  creditType: string
  amount: number
  price: number
  currency: string
  createdAt: string | Date
  pack?: { name: string } | null
}

interface Props {
  data: ClientAiUsageOverview
  creditPacks: CreditPackView[]
  creditRequests: CreditRequestView[]
}

function formatCurrency(amount: number, currency: string, locale: 'es' | 'en') {
  try {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-CL', {
      style: 'currency',
      currency,
      minimumFractionDigits: currency === 'CLP' ? 0 : 2,
      maximumFractionDigits: currency === 'CLP' ? 0 : 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount}`
  }
}

export function AiUsageView({ data, creditPacks, creditRequests }: Props) {
  const { t, locale } = useDashboardI18n()
  const router = useRouter()
  const [requesting, setRequesting] = useState<string | null>(null)
  const { characters } = data.quotas

  const pendingPackIds = new Set(
    creditRequests.filter((request) => request.status === 'pending').map((request) => request.packId)
  )
  const showUpsell = shouldShowAiCreditUpsell({
    charactersEnabled: characters.enabled,
    charactersRemaining: characters.remaining,
    activePacks: creditPacks.length,
  })

  const characterPercent =
    characters.limit > 0
      ? Math.min(100, Math.round((characters.used / characters.limit) * 100))
      : 0
  async function requestPack(packId: string) {
    setRequesting(packId)
    try {
      const response = await fetch('/api/dashboard/ai-credits/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || t('aiCreditPacks.requestError'))
      }
      showToast({ type: 'success', title: t('aiCreditPacks.requested') })
      router.refresh()
    } catch (error) {
      showToast({
        type: 'error',
        title: error instanceof Error ? error.message : t('aiCreditPacks.requestError'),
      })
    } finally {
      setRequesting(null)
    }
  }

  return (
    <div className="space-y-6">
      {showUpsell && (
        <section className="rounded-xl border border-brand/40 bg-brand/10 p-4">
          <div className="flex items-start gap-3">
            <SparklesIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {t('aiCreditPacks.exhaustedTitle')}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('aiCreditPacks.exhaustedText')}
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-4">
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
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>{formatAiPeriod(data.currentPeriod, locale)}</span>
                {characters.extraRemaining > 0 && (
                  <span>
                    {t('aiCreditPacks.extraCharacters', {
                      count: formatAiNumber(characters.extraRemaining, locale),
                    })}
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">{t('aiUsage.notIncluded')}</p>
          )}
        </section>

      </div>

      {creditPacks.length > 0 && (
        <section className="card p-5">
          <h2 className="text-lg font-semibold text-foreground">{t('aiCreditPacks.title')}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t('aiCreditPacks.subtitle')}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {creditPacks.map((pack) => {
              const pending = pendingPackIds.has(pack.id)
              const isMusic = pack.creditType === 'music'
              return (
                <div key={pack.id} className="rounded-xl border border-border bg-secondary/30 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{pack.name}</h3>
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand">
                      {isMusic ? t('aiCreditPacks.music') : t('aiCreditPacks.characters')}
                    </span>
                  </div>
                  {pack.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{pack.description}</p>
                  )}
                  <p className="mt-3 font-mono text-sm text-foreground">
                    {isMusic
                      ? t('aiCreditPacks.musicAmount', { count: pack.amount })
                      : t('aiCreditPacks.charactersAmount', {
                          count: formatAiNumber(pack.amount, locale),
                        })}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-brand">
                    {formatCurrency(pack.price, pack.currency, locale)}
                  </p>
                  <button
                    type="button"
                    onClick={() => void requestPack(pack.id)}
                    disabled={pending || requesting === pack.id}
                    className="btn-primary mt-3 w-full text-xs disabled:opacity-50"
                  >
                    {pending
                      ? t('aiCreditPacks.pending')
                      : requesting === pack.id
                        ? t('aiCreditPacks.requesting')
                        : t('aiCreditPacks.request')}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

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

      {creditRequests.length > 0 && (
        <section className="card p-5">
          <h2 className="text-lg font-semibold text-foreground">{t('aiCreditPacks.requestsTitle')}</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">{t('aiCreditPacks.pack')}</th>
                  <th className="pb-2 pr-3 font-medium">{t('aiCreditPacks.statusLabel')}</th>
                  <th className="pb-2 text-right font-medium">{t('aiCreditPacks.price')}</th>
                </tr>
              </thead>
              <tbody>
                {creditRequests.map((request) => (
                  <tr key={request.id} className="border-b border-border/60 text-foreground">
                    <td className="py-2 pr-3">{request.pack?.name ?? request.packId}</td>
                    <td className="py-2 pr-3">
                      {request.status === 'pending'
                        ? t('aiCreditPacks.status.pending')
                        : request.status === 'approved'
                          ? t('aiCreditPacks.status.approved')
                          : t('aiCreditPacks.status.rejected')}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {formatCurrency(request.price, request.currency, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {creditRequests.length === 0 && creditPacks.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('aiCreditPacks.empty')}</p>
      )}

      <section className="card p-5">
        <h2 className="text-lg font-semibold text-foreground">{t('aiUsage.historyTitle')}</h2>
        <div className="mt-4">
          <AiUsageHistoryTable rows={data.history} />
        </div>
      </section>
    </div>
  )
}
