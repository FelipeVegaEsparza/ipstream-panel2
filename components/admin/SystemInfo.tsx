'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import { 
  Server, 
  Cpu, 
  MemoryStick, 
  HardDrive, 
  Clock, 
  Monitor,
  Code,
  Zap
} from 'lucide-react'

interface SystemInfoProps {
  info: {
    version: string
    buildDate: string
    environment: string
    nodeVersion: string
    platform: string
    architecture: string
    uptime: number
    memoryUsage: {
      rss: number
      heapUsed: number
      heapTotal: number
      external: number
      arrayBuffers: number
    }
    cpuUsage: {
      user: number
      system: number
    }
  }
}

export function SystemInfo({ info }: SystemInfoProps) {
  const { t } = useDashboardI18n()
  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  const getEnvironmentBadge = (env: string) => {
    const envConfig = {
      production: { color: 'bg-green-600', text: t('admin.systemInfo.production') },
      development: { color: 'bg-brand', text: t('admin.systemInfo.development') },
      staging: { color: 'bg-orange-600', text: t('admin.systemInfo.staging') },
      test: { color: 'bg-purple-600', text: t('admin.systemInfo.test') }
    }

    const config = envConfig[env as keyof typeof envConfig] || envConfig.development

    return (
      <Badge className={`${config.color} text-foreground`}>
        {config.text}
      </Badge>
    )
  }

  const systemSpecs = [
    {
      label: t('admin.systemInfo.version'),
      value: `v${info.version}`,
      icon: Code,
      color: 'text-brand'
    },
    {
      label: t('admin.systemInfo.buildDate'),
      value: info.buildDate,
      icon: Clock,
      color: 'text-green-400'
    },
    {
      label: t('admin.systemInfo.environment'),
      value: getEnvironmentBadge(info.environment),
      icon: Monitor,
      color: 'text-purple-400'
    },
    {
      label: 'Node.js',
      value: info.nodeVersion,
      icon: Server,
      color: 'text-orange-400'
    },
    {
      label: t('admin.systemInfo.platform'),
      value: `${info.platform} (${info.architecture})`,
      icon: Cpu,
      color: 'text-brand'
    },
    {
      label: t('admin.systemSettings.uptime'),
      value: formatUptime(info.uptime),
      icon: Zap,
      color: 'text-pink-400'
    }
  ]

  const memoryStats = [
    {
      label: t('admin.systemInfo.memoryRss'),
      value: formatBytes(info.memoryUsage.rss),
      description: t('admin.systemInfo.memoryRssDesc')
    },
    {
      label: t('admin.systemInfo.heapUsed'),
      value: formatBytes(info.memoryUsage.heapUsed),
      description: t('admin.systemInfo.heapUsedDesc')
    },
    {
      label: t('admin.systemInfo.heapTotal'),
      value: formatBytes(info.memoryUsage.heapTotal),
      description: t('admin.systemInfo.heapTotalDesc')
    },
    {
      label: t('admin.systemInfo.external'),
      value: formatBytes(info.memoryUsage.external),
      description: t('admin.systemInfo.externalDesc')
    }
  ]

  return (
    <div className="space-y-6">
      {/* Información General */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Server className="h-5 w-5" />
            {t('admin.systemInfo.systemInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {systemSpecs.map((spec, index) => {
              const Icon = spec.icon
              return (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${spec.color}`} />
                    <span className="text-muted-foreground font-medium">{spec.label}</span>
                  </div>
                  <div className="text-foreground">
                    {typeof spec.value === 'string' ? spec.value : spec.value}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Uso de Memoria */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <MemoryStick className="h-5 w-5" />
            {t('admin.systemInfo.memoryUsage')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {memoryStats.map((stat, index) => (
              <div key={index} className="p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-foreground font-medium">{stat.label}</span>
                  <span className="text-brand font-bold">{stat.value}</span>
                </div>
                <p className="text-sm text-muted-foreground">{stat.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Uso de CPU */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            {t('admin.systemInfo.cpuUsage')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <span className="text-muted-foreground">{t('admin.systemInfo.userTime')}</span>
              <span className="text-green-400 font-bold">{(info.cpuUsage.user / 1000).toFixed(2)}ms</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <span className="text-muted-foreground">{t('admin.systemInfo.systemTime')}</span>
              <span className="text-orange-400 font-bold">{(info.cpuUsage.system / 1000).toFixed(2)}ms</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}