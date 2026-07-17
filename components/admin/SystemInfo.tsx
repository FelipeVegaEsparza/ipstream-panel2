'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
      production: { color: 'bg-green-600', text: 'Producción' },
      development: { color: 'bg-blue-600', text: 'Desarrollo' },
      staging: { color: 'bg-orange-600', text: 'Staging' },
      test: { color: 'bg-purple-600', text: 'Pruebas' }
    }

    const config = envConfig[env as keyof typeof envConfig] || envConfig.development

    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    )
  }

  const systemSpecs = [
    {
      label: 'Versión del Sistema',
      value: `v${info.version}`,
      icon: Code,
      color: 'text-blue-400'
    },
    {
      label: 'Fecha de Compilación',
      value: info.buildDate,
      icon: Clock,
      color: 'text-green-400'
    },
    {
      label: 'Entorno',
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
      label: 'Plataforma',
      value: `${info.platform} (${info.architecture})`,
      icon: Cpu,
      color: 'text-cyan-400'
    },
    {
      label: 'Tiempo Activo',
      value: formatUptime(info.uptime),
      icon: Zap,
      color: 'text-pink-400'
    }
  ]

  const memoryStats = [
    {
      label: 'Memoria RSS',
      value: formatBytes(info.memoryUsage.rss),
      description: 'Memoria física total utilizada'
    },
    {
      label: 'Heap Usado',
      value: formatBytes(info.memoryUsage.heapUsed),
      description: 'Memoria heap actualmente en uso'
    },
    {
      label: 'Heap Total',
      value: formatBytes(info.memoryUsage.heapTotal),
      description: 'Memoria heap total asignada'
    },
    {
      label: 'Externa',
      value: formatBytes(info.memoryUsage.external),
      description: 'Memoria externa utilizada'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Información General */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Server className="h-5 w-5" />
            Información del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {systemSpecs.map((spec, index) => {
              const Icon = spec.icon
              return (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${spec.color}`} />
                    <span className="text-gray-300 font-medium">{spec.label}</span>
                  </div>
                  <div className="text-white">
                    {typeof spec.value === 'string' ? spec.value : spec.value}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Uso de Memoria */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MemoryStick className="h-5 w-5" />
            Uso de Memoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {memoryStats.map((stat, index) => (
              <div key={index} className="p-3 rounded-lg bg-gray-700/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-medium">{stat.label}</span>
                  <span className="text-blue-400 font-bold">{stat.value}</span>
                </div>
                <p className="text-sm text-gray-400">{stat.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Uso de CPU */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Uso de CPU
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
              <span className="text-gray-300">Tiempo de Usuario</span>
              <span className="text-green-400 font-bold">{(info.cpuUsage.user / 1000).toFixed(2)}ms</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
              <span className="text-gray-300">Tiempo de Sistema</span>
              <span className="text-orange-400 font-bold">{(info.cpuUsage.system / 1000).toFixed(2)}ms</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}