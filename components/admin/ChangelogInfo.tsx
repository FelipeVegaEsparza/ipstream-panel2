'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  const changelog = [
    {
      version: '1.0.0',
      date: '2024-07-16',
      type: 'release',
      title: 'Lanzamiento Inicial',
      changes: [
        { type: 'feature', text: 'Panel de administración completo' },
        { type: 'feature', text: 'Gestión de usuarios y clientes' },
        { type: 'feature', text: 'Sistema de autenticación con NextAuth' },
        { type: 'feature', text: 'Módulo de facturación y planes' },
        { type: 'feature', text: 'Estadísticas globales del sistema' },
        { type: 'feature', text: 'Sistema de impersonación de clientes' },
        { type: 'feature', text: 'Configuración del sistema' },
        { type: 'feature', text: 'Logs de actividad' },
        { type: 'feature', text: 'Información del sistema y soporte' }
      ]
    },
    {
      version: '0.9.0',
      date: '2024-07-10',
      type: 'beta',
      title: 'Versión Beta',
      changes: [
        { type: 'feature', text: 'Implementación de base de datos con Prisma' },
        { type: 'feature', text: 'Diseño responsive con Tailwind CSS' },
        { type: 'feature', text: 'Componentes UI reutilizables' },
        { type: 'fix', text: 'Corrección de problemas de autenticación' },
        { type: 'improvement', text: 'Optimización de rendimiento' }
      ]
    },
    {
      version: '0.5.0',
      date: '2024-07-01',
      type: 'alpha',
      title: 'Versión Alpha',
      changes: [
        { type: 'feature', text: 'Estructura inicial del proyecto' },
        { type: 'feature', text: 'Configuración de Next.js 14' },
        { type: 'feature', text: 'Implementación básica de rutas' },
        { type: 'feature', text: 'Diseño inicial de la interfaz' }
      ]
    }
  ]

  const getVersionBadge = (type: string) => {
    const typeConfig = {
      release: { color: 'bg-green-600', text: 'Release' },
      beta: { color: 'bg-blue-600', text: 'Beta' },
      alpha: { color: 'bg-orange-600', text: 'Alpha' },
      hotfix: { color: 'bg-red-600', text: 'Hotfix' }
    }

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.release

    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    )
  }

  const getChangeIcon = (type: string) => {
    const iconConfig = {
      feature: { icon: Plus, color: 'text-green-400' },
      fix: { icon: Bug, color: 'text-red-400' },
      improvement: { icon: Wrench, color: 'text-blue-400' },
      security: { icon: Shield, color: 'text-purple-400' }
    }

    const config = iconConfig[type as keyof typeof iconConfig] || iconConfig.feature
    const Icon = config.icon

    return <Icon className={`h-4 w-4 ${config.color}`} />
  }

  const getChangeTypeText = (type: string) => {
    const typeText = {
      feature: 'Nueva Funcionalidad',
      fix: 'Corrección de Error',
      improvement: 'Mejora',
      security: 'Seguridad'
    }

    return typeText[type as keyof typeof typeText] || 'Cambio'
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Historial de Cambios
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {changelog.map((release, index) => (
            <div key={index} className="relative">
              {/* Línea de tiempo */}
              {index < changelog.length - 1 && (
                <div className="absolute left-6 top-12 bottom-0 w-px bg-gray-600" />
              )}
              
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white">
                  <Tag className="h-6 w-6" />
                </div>
                
                <div className="flex-1 pb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">v{release.version}</h3>
                    {getVersionBadge(release.type)}
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Calendar className="h-4 w-4" />
                      {release.date}
                    </div>
                  </div>
                  
                  <h4 className="text-lg font-semibold text-gray-300 mb-4">
                    {release.title}
                  </h4>
                  
                  <div className="space-y-2">
                    {release.changes.map((change, changeIndex) => (
                      <div key={changeIndex} className="flex items-start gap-3 p-2 rounded-lg bg-gray-700/30">
                        {getChangeIcon(change.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-400">
                              {getChangeTypeText(change.type)}
                            </span>
                          </div>
                          <p className="text-white">{change.text}</p>
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
        <div className="mt-8 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className="h-5 w-5 text-blue-400" />
            <h4 className="text-white font-semibold">Próximas Actualizaciones</h4>
          </div>
          <p className="text-sm text-gray-300 mb-3">
            Estamos trabajando constantemente en nuevas funcionalidades y mejoras. 
            Mantente al día con las últimas actualizaciones.
          </p>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-green-400">
              <Plus className="h-4 w-4" />
              <span>Nuevas funcionalidades en desarrollo</span>
            </div>
            <div className="flex items-center gap-1 text-blue-400">
              <Wrench className="h-4 w-4" />
              <span>Mejoras continuas de rendimiento</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}