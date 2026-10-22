'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Building2, FileText, Activity, TrendingUp, Target } from 'lucide-react'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface StatsOverviewProps {
  totalUsers: number
  totalClients: number
  totalContent: number
  activeToday: number
  newLastWeek: number
  clientsWithContent: number
}

export function StatsOverview({
  totalUsers,
  totalClients,
  totalContent,
  activeToday,
  newLastWeek,
  clientsWithContent
}: StatsOverviewProps) {
  const { t } = useDashboardI18n()
  const stats = [
    {
      title: t('admin.statsWidgets.totalUsers'),
      value: totalUsers,
      icon: Users,
      color: 'text-brand',
      bgColor: 'bg-brand/10'
    },
    {
      title: t('admin.statsWidgets.totalClients'),
      value: totalClients,
      icon: Building2,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    {
      title: t('admin.statsWidgets.totalContent'),
      value: totalContent,
      icon: FileText,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    {
      title: t('admin.statsWidgets.activeToday'),
      value: activeToday,
      icon: Activity,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10'
    },
    {
      title: t('admin.statsWidgets.newLastWeek'),
      value: newLastWeek,
      icon: TrendingUp,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10'
    },
    {
      title: t('admin.statsWidgets.clientsWithContent'),
      value: clientsWithContent,
      icon: Target,
      color: 'text-brand',
      bgColor: 'bg-brand/10'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stat.value.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}