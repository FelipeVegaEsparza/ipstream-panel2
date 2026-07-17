'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  FileText, 
  AlertTriangle, 
  Info, 
  XCircle, 
  Shield, 
  Users, 
  Globe 
} from 'lucide-react'

interface LogsStatsProps {
  stats: {
    totalLogs: number
    errorLogs: number
    warningLogs: number
    infoLogs: number
    securityEvents: number
    uniqueUsers: number
    uniqueIPs: number
  }
}

export function LogsStats({ stats }: LogsStatsProps) {
  const statsData = [
    {
      title: 'Total Logs',
      value: stats.totalLogs,
      icon: FileText,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Errores',
      value: stats.errorLogs,
      icon: XCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10'
    },
    {
      title: 'Advertencias',
      value: stats.warningLogs,
      icon: AlertTriangle,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10'
    },
    {
      title: 'Información',
      value: stats.infoLogs,
      icon: Info,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    {
      title: 'Eventos Seguridad',
      value: stats.securityEvents,
      icon: Shield,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    {
      title: 'Usuarios Únicos',
      value: stats.uniqueUsers,
      icon: Users,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10'
    },
    {
      title: 'IPs Únicas',
      value: stats.uniqueIPs,
      icon: Globe,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {statsData.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index} className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stat.value.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}