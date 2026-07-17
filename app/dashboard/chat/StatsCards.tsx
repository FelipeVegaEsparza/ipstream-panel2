'use client'

import { MessageSquare, Users, Ban, Clock } from 'lucide-react'

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
  const cards = [
    {
      label: 'Mensajes última hora',
      value: stats.lastHourMessages,
      icon: Clock,
      color: 'text-cyan-300',
      bg: 'bg-cyan-500/10',
    },
    {
      label: 'Mensajes últimas 24h',
      value: stats.last24hMessages,
      icon: MessageSquare,
      color: 'text-purple-300',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Oyentes activos (1h)',
      value: stats.activeUsersLastHour,
      icon: Users,
      color: 'text-green-300',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Bans activos',
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
            className="bg-gray-800/40 border border-gray-700 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`p-1.5 rounded ${c.bg}`}>
                <Icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <span className="text-xs text-gray-400">{c.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{c.value}</p>
          </div>
        )
      })}
    </div>
  )
}
