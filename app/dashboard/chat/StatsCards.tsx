'use client'

import { MessageSquare, Users, Ban, Clock } from 'lucide-react'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

export interface ChatStats {
  lastHourMessages: number
  last24hMessages: number
  activeUsersLastHour: number
  activeBans: number
}

interface StatsCardsProps {
  stats: ChatStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const { t } = useDashboardI18n()
  const cards = [
    {
      label: t('chat.stats.lastHour'),
      value: stats.lastHourMessages,
      icon: Clock,
      color: 'text-brand',
      bg: 'bg-brand/10',
    },
    {
      label: t('chat.stats.last24h'),
      value: stats.last24hMessages,
      icon: MessageSquare,
      color: 'text-foreground',
      bg: 'bg-secondary',
    },
    {
      label: t('chat.stats.activeUsers'),
      value: stats.activeUsersLastHour,
      icon: Users,
      color: 'text-brand',
      bg: 'bg-brand/10',
    },
    {
      label: t('chat.stats.activeBans'),
      value: stats.activeBans,
      icon: Ban,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => {
        const Icon = c.icon
        return (
          <div
            key={c.label}
            className="rounded-xl border border-border bg-card p-3 shadow-soft"
          >
            <div className="flex items-center gap-2">
              <div className={`rounded-lg p-1.5 ${c.bg}`}>
                <Icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <span className="text-[11px] leading-tight text-muted-foreground">
                {c.label}
              </span>
            </div>
            <p className="mt-1 text-xl font-bold text-foreground">{c.value}</p>
          </div>
        )
      })}
    </div>
  )
}
