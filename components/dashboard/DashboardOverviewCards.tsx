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

function MetricCell(props: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line p-4 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0">
      <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
        {props.icon}
        {props.label}
      </div>
      <div className="mt-2">{props.children}</div>
    </div>
  )
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
  if (hasRadio) storageItems.push({ label: t('nowPlaying.radio'), used: usageRadio, quota: plan?.radioStorageQuotaMB ?? null })
  if (hasTv) storageItems.push({ label: t('nowPlaying.tv'), used: usageVideo, quota: plan?.videoStorageQuotaMB ?? null })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCell
        icon={<Headphones className="h-3.5 w-3.5" />}
        label={t('overview.listeners')}
      >
        {hasRadio || hasTv ? (
          <div className="flex items-end gap-5">
            {hasRadio && (
              <div>
                <div className="dashboard-metric text-2xl font-medium text-foreground">{radioListeners}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{t('nowPlaying.radio')}</div>
              </div>
            )}
            {hasTv && (
              <div>
                <div className="dashboard-metric text-2xl font-medium text-foreground">{tvViewers}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{t('nowPlaying.tv')}</div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t('overview.noStreaming')}</p>
        )}
      </MetricCell>

      <MetricCell icon={<HardDrive className="h-3.5 w-3.5" />} label={t('overview.storage')}>
        {storageItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('overview.noStorage')}</p>
        ) : (
          <div className="space-y-2.5">
            {storageItems.map((item) => {
              const usedMB = item.used?.totalMB ?? 0
              const quotaMB = item.quota ?? item.used?.quotaMB ?? null
              const pct = item.used?.percentUsed ?? (quotaMB ? Math.min(100, (usedMB / quotaMB) * 100) : null)
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="dashboard-metric text-foreground">
                      {fmtMB(usedMB, t('overview.unlimited'))} / {fmtMB(quotaMB, t('overview.unlimited'))}
                    </span>
                  </div>
                  {quotaMB !== null && pct !== null && (
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className={`h-full rounded-full ${item.used?.exceeded ? 'bg-[color:var(--danger)]' : pct > 80 ? 'bg-[color:var(--warn)]' : 'bg-[color:var(--signal)]'}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </MetricCell>

      <MetricCell icon={<Crown className="h-3.5 w-3.5" />} label={t('overview.plan')}>
        {plan ? (
          <>
            <div className="truncate text-[15px] font-medium text-foreground">{plan.name}</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              {plan.interval === 'monthly' ? t('overview.monthly') : t('overview.yearly')}
              {planLabel ? ` · ${planLabel}` : ''}
            </div>
            <div className="dashboard-metric mt-1 text-[11px] font-medium text-signal">
              {fmtCurrency(plan.price, plan.currency, locale)}
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t('overview.noPlan')} <span className="text-signal">{t('overview.contactSupport')}</span>
          </p>
        )}
      </MetricCell>

      <MetricCell icon={<Smartphone className="h-3.5 w-3.5" />} label={t('overview.pwaInstalled')}>
        <div className="dashboard-metric text-2xl font-medium text-foreground">
          {installedCount === null ? '—' : installedCount}
        </div>
        <div className="mt-0.5 text-[10px] text-muted-foreground">
          {installedCount === null
            ? t('overview.devicesInstalled')
            : installedCount === 1
              ? t('overview.deviceInstalled')
              : t('overview.devicesInstalled')}
        </div>
      </MetricCell>
    </div>
  )
}
