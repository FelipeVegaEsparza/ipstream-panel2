'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tv, Newspaper, Play, Award, Megaphone, Crown } from 'lucide-react'

interface Client {
  id: string
  name: string
  user: {
    name: string | null
    email: string
  }
  totalContent: number
  _count: {
    programs: number
    news: number
    rankingVideos: number
    sponsors: number
    promotions: number
  }
}

interface StatsModulesProps {
  programs: number
  news: number
  videos: number
  sponsors: number
  promotions: number
  topClients: Client[]
}

export function StatsModules({
  programs,
  news,
  videos,
  sponsors,
  promotions,
  topClients
}: StatsModulesProps) {
  const modules = [
    {
      name: 'Programas',
      count: programs,
      icon: Tv,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      name: 'Noticias',
      count: news,
      icon: Newspaper,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    {
      name: 'Videos',
      count: videos,
      icon: Play,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    {
      name: 'Sponsors',
      count: sponsors,
      icon: Award,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10'
    },
    {
      name: 'Promociones',
      count: promotions,
      icon: Megaphone,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Resumen de Módulos */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-400" />
            Contenido por Módulo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {modules.map((module, index) => {
              const Icon = module.icon
              return (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${module.bgColor}`}>
                      <Icon className={`h-4 w-4 ${module.color}`} />
                    </div>
                    <span className="text-gray-300 font-medium">
                      {module.name}
                    </span>
                  </div>
                  <Badge variant="secondary" className="bg-gray-600 text-white">
                    {module.count}
                  </Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Clientes */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-400" />
            Top Clientes Activos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topClients.length > 0 ? (
              topClients.map((client, index) => (
                <div key={client.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {client.name}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {client.user.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">
                      {client.totalContent}
                    </p>
                    <p className="text-gray-400 text-xs">
                      contenidos
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No hay clientes con contenido aún</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}