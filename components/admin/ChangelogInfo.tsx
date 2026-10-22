'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import { 
  GitBranch, 
  Plus, 
  Wrench, 
  Bug, 
  Shield, 
  Calendar,
  Tag
} from 'lucide-react'

export function ChangelogInfo() {
  const { t } = useDashboardI18n()
  const changelog = [
    {
      version: '1.0.0',
      date: '2024-07-16',
      type: 'release',
      title: t('admin.changelog.initialRelease'),
      changes: [
        { type: 'feature', text: t('admin.changelog.adminPanel') },
        { type: 'feature', text: t('admin.changelog.userManagement') },
        { type: 'feature', text: t('admin.changelog.authSystem') },
        { type: 'feature', text: t('admin.changelog.billingModule') },
        { type: 'feature', text: t('admin.changelog.globalStats') },
        { type: 'feature', text: t('admin.changelog.impersonation') },
        { type: 'feature', text: t('admin.changelog.systemConfig') },
        { type: 'feature', text: t('admin.changelog.activityLogs') },
        { type: 'feature', text: t('admin.changelog.systemInfoSupport') }
      ]
    },
    {
      version: '0.9.0',
      date: '2024-07-10',
      type: 'beta',
      title: t('admin.changelog.betaVersion'),
      changes: [
        { type: 'feature', text: t('admin.changelog.prismaDb') },
        { type: 'feature', text: t('admin.changelog.responsiveDesign') },
        { type: 'feature', text: t('admin.changelog.reusableUi') },
        { type: 'fix', text: t('admin.changelog.authFixes') },
        { type: 'improvement', text: t('admin.changelog.perfOptimization') }
      ]
    },
    {
      version: '0.5.0',
      date: '2024-07-01',
      type: 'alpha',
      title: t('admin.changelog.alphaVersion'),
      changes: [
        { type: 'feature', text: t('admin.changelog.initialStructure') },
        { type: 'feature', text: t('admin.changelog.nextSetup') },
        { type: 'feature', text: t('admin.changelog.basicRoutes') },
        { type: 'feature', text: t('admin.changelog.initialDesign') }
      ]
    }
  ]

  const getVersionBadge = (type: string) => {
    const typeConfig = {
      release: { color: 'bg-green-600', text: 'Release' },
      beta: { color: 'bg-brand', text: 'Beta' },
      alpha: { color: 'bg-orange-600', text: 'Alpha' },
      hotfix: { color: 'bg-red-600', text: 'Hotfix' }
    }

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.release

    return (
      <Badge className={`${config.color} text-foreground`}>
        {config.text}
      </Badge>
    )
  }

  const getChangeIcon = (type: string) => {
    const iconConfig = {
      feature: { icon: Plus, color: 'text-green-400' },
      fix: { icon: Bug, color: 'text-red-400' },
      improvement: { icon: Wrench, color: 'text-brand' },
      security: { icon: Shield, color: 'text-purple-400' }
    }

    const config = iconConfig[type as keyof typeof iconConfig] || iconConfig.feature
    const Icon = config.icon

    return <Icon className={`h-4 w-4 ${config.color}`} />
  }

  const getChangeTypeText = (type: string) => {
    const typeText = {
      feature: t('admin.changelog.newFeature'),
      fix: t('admin.changelog.bugFix'),
      improvement: t('admin.changelog.improvement'),
      security: t('admin.changelog.security')
    }

    return typeText[type as keyof typeof typeText] || t('admin.changelog.change')
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          {t('admin.changelog.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {changelog.map((release, index) => (
            <div key={index} className="relative">
              {/* Línea de tiempo */}
              {index < changelog.length - 1 && (
                <div className="absolute left-6 top-12 bottom-0 w-px bg-secondary" />
              )}
              
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-brand text-white">
                  <Tag className="h-6 w-6" />
                </div>
                
                <div className="flex-1 pb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-foreground">v{release.version}</h3>
                    {getVersionBadge(release.type)}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {release.date}
                    </div>
                  </div>
                  
                  <h4 className="text-lg font-semibold text-muted-foreground mb-4">
                    {release.title}
                  </h4>
                  
                  <div className="space-y-2">
                    {release.changes.map((change, changeIndex) => (
                      <div key={changeIndex} className="flex items-start gap-3 p-2 rounded-lg bg-secondary/30">
                        {getChangeIcon(change.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-muted-foreground">
                              {getChangeTypeText(change.type)}
                            </span>
                          </div>
                          <p className="text-foreground">{change.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Información adicional */}
        <div className="mt-8 p-4 rounded-lg bg-brand/10 border border-brand/30">
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className="h-5 w-5 text-brand" />
            <h4 className="text-foreground font-semibold">{t('admin.changelog.upcoming')}</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {t('admin.changelog.upcomingHint')}
          </p>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-green-400">
              <Plus className="h-4 w-4" />
              <span>{t('admin.changelog.inDevelopment')}</span>
            </div>
            <div className="flex items-center gap-1 text-brand">
              <Wrench className="h-4 w-4" />
              <span>{t('admin.changelog.continuousImprovements')}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}