'use client'

import { useEffect, useState } from 'react'
import { Headphones, HardDrive, Crown, Smartphone } from 'lucide-react'
import { useStreamingStatus } from '@/lib/useStreamingStatus'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface OverviewPlan {
  name: string
  services: string
  interval: string
  price: number
  currency: string
  radioStorageQuotaMB: number | null
  videoStorageQuotaMB: number | null
}

interface OverviewStorage {
  totalMB: number
  quotaMB: number | null
  percentUsed: number | null
  exceeded: boolean
}

interface DashboardOverviewCardsProps {
  plan: OverviewPlan | null
  usageRadio: OverviewStorage | null
  usageVideo: OverviewStorage | null
}

interface TvStatusWithViewers {
  status?: string
  viewers?: number
}

function fmtMB(mb: number | null | undefined, unlimited: string) {
  if (mb === null || mb === undefined) return unlimited
  if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
  return `${mb} MB`
}

function fmtCurrency(price: number, currency: string, locale: 'es' | 'en') {
  try {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-CL', {
      style: 'currency',
      currency,
      maximumFractionDigits: price % 1 === 0 ? 0 : 2,
    }).format(price)
  } catch {
    return `${currency} ${price}`
  }
}

export function DashboardOverviewCards({ plan, usageRadio, usageVideo }: DashboardOverviewCardsProps) {
  const { t, locale } = useDashboardI18n()
  const { status } = useStreamingStatus({ pollingMs: 5000 })
  const [tvViewers, setTvViewers] = useState<number>(0)
  const [installedCount, setInstalledCount] = useState<number | null>(null)

  const hasRadio = plan?.services === 'radio' || plan?.services === 'both'
  const hasTv = plan?.services === 'tv' || plan?.services === 'both'

  useEffect(() => {
    let active = true
    fetch('/api/dashboard/pwa-stats', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (active) setInstalledCount(typeof data.installedCount === 'number' ? data.installedCount : 0)
      })
      .catch(() => {
        // silencioso: se muestra "—"
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!hasTv) return
    let active = true
    const fetchTv = async () => {
      try {
        const res = await fetch('/api/dashboard/television/status', { cache: 'no-store' })
        if (res.ok) {
          const data: TvStatusWithViewers = await res.json()
          if (active) setTvViewers(data.viewers ?? 0)
        }
      } catch {
        // silencioso
      }
    }
    fetchTv()
    const id = setInterval(fetchTv, 5000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [hasTv])

  const radioListeners = status?.icecast?.listeners ?? 0
  const planLabel = plan
    ? plan.services === 'radio'
      ? t('overview.radioOnly')
      : plan.services === 'tv'
        ? t('overview.tvOnly')
        : t('overview.radioTv')
    : null

  const storageItems: { label: string; used: OverviewStorage | null; quota: number | null }[] = []
  if (hasRadio) storageItems.push({ label: 'Radio', used: usageRadio, quota: plan?.radioStorageQuotaMB ?? null })
  if (hasTv) storageItems.push({ label: 'TV', used: usageVideo, quota: plan?.videoStorageQuotaMB ?? null })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Oyentes en vivo */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-soft">
        <div className="flex items-center gap-2 mb-3">
          <Headphones className="h-4 w-4 text-[color:var(--brand-500)]" />
          <h3 className="font-semibold text-foreground">{t('overview.listeners')}</h3>
        </div>
        <div className="flex items-end gap-6">
          <div>
            <div className="text-2xl font-bold text-foreground">{radioListeners}</div>
            <div className="text-xs text-muted-foreground">Radio</div>
          </div>
          {hasTv && (
            <div>
              <div className="text-2xl font-bold text-foreground">{tvViewers}</div>
              <div className="text-xs text-muted-foreground">TV</div>
            </div>
          )}
        </div>
        {!hasRadio && !hasTv && <p className="text-xs text-muted-foreground mt-1">{t('overview.noStreaming')}</p>}
      </div>

      {/* Almacenamiento */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-soft">
        <div className="flex items-center gap-2 mb-3">
          <HardDrive className="h-4 w-4 text-[color:var(--brand-500)]" />
          <h3 className="font-semibold text-foreground">{t('overview.storage')}</h3>
        </div>
        {storageItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('overview.noStorage')}</p>
        ) : (
          <div className="space-y-3">
            {storageItems.map((item) => {
              const usedMB = item.used?.totalMB ?? 0
              const quotaMB = item.quota ?? item.used?.quotaMB ?? null
              const pct = item.used?.percentUsed ?? (quotaMB ? Math.min(100, (usedMB / quotaMB) * 100) : null)
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="text-foreground font-medium">
                      {fmtMB(usedMB, t('overview.unlimited'))} / {fmtMB(quotaMB, t('overview.unlimited'))}
                    </span>
                  </div>
                  {quotaMB !== null && pct !== null && (
                    <div className="mt-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.used?.exceeded ? 'bg-red-500' : pct > 80 ? 'bg-yellow-500' : 'bg-[color:var(--brand-500)]'}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Plan contratado */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-soft">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="h-4 w-4 text-[color:var(--brand-500)]" />
          <h3 className="font-semibold text-foreground">{t('overview.plan')}</h3>
        </div>
        {plan ? (
          <>
            <div className="text-2xl font-bold text-foreground">{plan.name}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {plan.interval === 'monthly' ? t('overview.monthly') : t('overview.yearly')}
              {planLabel ? ` · ${planLabel}` : ''}
            </div>
            <div className="text-sm text-[color:var(--brand-500)] font-semibold mt-2">
              {fmtCurrency(plan.price, plan.currency, locale)}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('overview.noPlan')}{' '}
            <span className="text-[color:var(--brand-500)]">{t('overview.contactSupport')}</span>
          </p>
        )}
      </div>

      {/* PWA instalada */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-soft">
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="h-4 w-4 text-[color:var(--brand-500)]" />
          <h3 className="font-semibold text-foreground">{t('overview.pwaInstalled')}</h3>
        </div>
        <div className="text-2xl font-bold text-foreground">
          {installedCount === null ? '—' : installedCount}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {installedCount === null
            ? t('overview.devicesInstalled')
            : installedCount === 1
              ? t('overview.deviceInstalled')
              : t('overview.devicesInstalled')}
        </div>
      </div>
    </div>
  )
}
