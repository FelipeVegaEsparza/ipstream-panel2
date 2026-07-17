'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, User, Clock } from 'lucide-react'

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
  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Hace un momento'
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `Hace ${diffInHours}h`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `Hace ${diffInDays}d`
    
    return date.toLocaleDateString('es-ES')
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'CLIENT':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-400" />
          Actividad Reciente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentActivity.length > 0 ? (
            recentActivity.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-700/50 hover:bg-gray-700/70 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-blue-600">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-medium">
                        {user.name || 'Usuario sin nombre'}
                      </p>
                      <Badge 
                        variant="outline" 
                        className={getRoleBadgeColor(user.role)}
                      >
                        {user.role}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-400 text-sm">
                      {user.email}
                    </p>
                    
                    {user.client && (
                      <p className="text-gray-500 text-xs mt-1">
                        Cliente: {user.client.name}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-1 text-gray-400 text-sm">
                    <Clock className="h-4 w-4" />
                    {formatTimeAgo(new Date(user.updatedAt))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No hay actividad reciente</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}