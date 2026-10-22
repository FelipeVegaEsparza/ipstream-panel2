'use client'

import { Check, X, Radio, MonitorPlay, HardDrive } from 'lucide-react'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface PlanServicesCardProps {
  plan: {
    name: string
    services: string
    radioStorageQuotaMB: number | null
    videoStorageQuotaMB: number | null
    interval: string
    price: number
    currency: string
  } | null
}

const RADIO_SECTIONS = [
  'plan.section.streaming',
  'plan.section.library',
  'plan.section.playlists',
  'plan.section.dj',
  'plan.section.jingles',
  'plan.section.schedule',
  'plan.section.stats',
] as const
const TV_SECTIONS = [
  'plan.section.tvBroadcast',
  'plan.section.obs',
  'plan.section.videoLibrary',
  'plan.section.tvSchedule',
  'plan.section.grid',
] as const

function fmtMB(mb: number | null, unlimited: string) {
  if (mb === null || mb === undefined) return unlimited
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
  return `${mb} MB`
}

export function PlanServicesCard({ plan }: PlanServicesCardProps) {
  const { t } = useDashboardI18n()
  if (!plan) {
    return (
      <div className="bg-card/80 rounded-2xl border border-border/50 p-5">
        <p className="text-sm text-muted-foreground">
          {t('plan.noPlan')} {''}
          <span className="text-brand">{t('plan.contactSupport')}</span>
        </p>
      </div>
    )
  }

  const hasRadio = plan.services !== 'tv'
  const hasTv = plan.services !== 'radio'

  return (
    <div className="bg-gradient-to-br from-card/90 to-card/90 rounded-2xl border border-border/50 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">{t('plan.title')}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-brand/20 text-brand font-medium">
            {plan.services === 'radio' ? t('plan.radioOnly') : plan.services === 'tv' ? t('plan.tvOnly') : t('plan.both')}
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{plan.name}</span> ·{' '}
          {plan.interval === 'monthly' ? t('plan.monthly') : t('plan.yearly')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg bg-card/70 border border-border p-4">
          <p className="text-sm font-medium text-brand flex items-center gap-1.5 mb-2">
            <Radio className="h-4 w-4" /> {t('plan.radio')}
          </p>
          {hasRadio ? (
            <ul className="space-y-1">
              {RADIO_SECTIONS.map((s) => (
                <li key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Check className="h-3 w-3 text-green-400" /> {t(s)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <X className="h-3 w-3 text-red-400" /> {t('plan.notIncluded')}
            </p>
          )}
        </div>

        <div className="rounded-lg bg-card/70 border border-border p-4">
          <p className="text-sm font-medium text-purple-300 flex items-center gap-1.5 mb-2">
            <MonitorPlay className="h-4 w-4" /> {t('plan.tv')}
          </p>
          {hasTv ? (
            <ul className="space-y-1">
              {TV_SECTIONS.map((s) => (
                <li key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Check className="h-3 w-3 text-green-400" /> {t(s)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <X className="h-3 w-3 text-red-400" /> {t('plan.notIncluded')}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <HardDrive className="h-3.5 w-3.5 text-brand" />
          {t('plan.radioStorage')} <span className="text-foreground font-medium">{fmtMB(plan.radioStorageQuotaMB, t('plan.unlimited'))}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <HardDrive className="h-3.5 w-3.5 text-brand" />
          {t('plan.videoStorage')} <span className="text-foreground font-medium">{fmtMB(plan.videoStorageQuotaMB, t('plan.unlimited'))}</span>
        </span>
      </div>
    </div>
  )
}
