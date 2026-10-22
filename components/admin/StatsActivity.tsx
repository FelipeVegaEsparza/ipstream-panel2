'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, User, Clock } from 'lucide-react'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface User {
  id: string
  name: string | null
  email: string
  role: string
  updatedAt: Date
  client?: {
    id: string
    name: string
  } | null
}

interface StatsActivityProps {
  recentActivity: User[]
}

export function StatsActivity({ recentActivity }: StatsActivityProps) {
  const { locale, t } = useDashboardI18n()
  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return t('admin.statsWidgets.momentAgo')
    if (diffInMinutes < 60) return t('admin.statsWidgets.minutesAgo', { count: diffInMinutes })
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return t('admin.statsWidgets.hoursAgo', { count: diffInHours })
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return t('admin.statsWidgets.daysAgo', { count: diffInDays })
    
    return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'es-ES')
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'CLIENT':
        return 'bg-brand/20 text-brand border-brand/30'
      default:
        return 'bg-secondary/20 text-muted-foreground border-border/30'
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-400" />
          {t('admin.statsWidgets.recentActivity')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentActivity.length > 0 ? (
            recentActivity.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-brand">
                    <User className="h-5 w-5 text-foreground" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-foreground font-medium">
                        {user.name || t('admin.statsWidgets.noName')}
                      </p>
                      <Badge 
                        variant="outline" 
                        className={getRoleBadgeColor(user.role)}
                      >
                        {user.role}
                      </Badge>
                    </div>
                    
                    <p className="text-muted-foreground text-sm">
                      {user.email}
                    </p>
                    
                    {user.client && (
                      <p className="text-muted-foreground text-xs mt-1">
                        {t('admin.statsWidgets.client')} {user.client.name}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <Clock className="h-4 w-4" />
                    {formatTimeAgo(new Date(user.updatedAt))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('admin.statsWidgets.noRecentActivity')}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}