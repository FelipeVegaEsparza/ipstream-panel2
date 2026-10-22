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
      color: 'text-purple-300',
      bg: 'bg-purple-500/10',
    },
    {
      label: t('chat.stats.activeUsers'),
      value: stats.activeUsersLastHour,
      icon: Users,
      color: 'text-green-300',
      bg: 'bg-green-500/10',
    },
    {
      label: t('chat.stats.activeBans'),
      value: stats.activeBans,
      icon: Ban,
      color: 'text-red-300',
      bg: 'bg-red-500/10',
    },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => {
        const Icon = c.icon
        return (
          <div
            key={c.label}
            className="bg-card/40 border border-border rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`p-1.5 rounded ${c.bg}`}>
                <Icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
          </div>
        )
      })}
    </div>
  )
}
