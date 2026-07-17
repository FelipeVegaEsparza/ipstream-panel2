'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Headphones, 
  Mail, 
  MessageCircle, 
  Phone, 
  ExternalLink,
  Book,
  Video,
  FileText,
  Globe,
  Clock
} from 'lucide-react'

export function SupportInfo() {
  const supportChannels = [
    {
      name: 'Email de Soporte',
      description: 'Contacto directo para problemas técnicos',
      contact: 'soporte@ipstream.com',
      responseTime: '24 horas',
      availability: '24/7',
      icon: Mail,
      color: 'text-blue-400',
      action: () => window.open('mailto:soporte@ipstream.com', '_blank')
    },
    {
      name: 'Chat en Vivo',
      description: 'Asistencia inmediata durante horario laboral',
      contact: 'chat.ipstream.com',
      responseTime: '5 minutos',
      availability: 'Lun-Vie 9:00-18:00',
      icon: MessageCircle,
      color: 'text-green-400',
      action: () => window.open('https://chat.ipstream.com', '_blank')
    },
    {
      name: 'Teléfono',
      description: 'Soporte telefónico para emergencias',
      contact: '+1 (555) 123-4567',
      responseTime: 'Inmediato',
      availability: 'Lun-Vie 9:00-18:00',
      icon: Phone,
      color: 'text-orange-400',
      action: () => window.open('tel:+15551234567', '_blank')
    },
    {
      name: 'Centro de Ayuda',
      description: 'Documentación y guías completas',
      contact: 'help.ipstream.com',
      responseTime: 'Autoservicio',
      availability: '24/7',
      icon: Book,
      color: 'text-purple-400',
      action: () => window.open('https://help.ipstream.com', '_blank')
    }
  ]

  const resources = [
    {
      title: 'Documentación API',
      description: 'Guía completa para desarrolladores',
      url: 'https://docs.ipstream.com/api',
      icon: FileText,
      color: 'text-blue-400'
    },
    {
      title: 'Tutoriales en Video',
      description: 'Aprende paso a paso con videos',
      url: 'https://videos.ipstream.com',
      icon: Video,
      color: 'text-red-400'
    },
    {
      title: 'Foro de Comunidad',
      description: 'Conecta con otros usuarios',
      url: 'https://community.ipstream.com',
      icon: MessageCircle,
      color: 'text-green-400'
    },
    {
      title: 'Estado del Servicio',
      description: 'Monitorea el estado de nuestros servicios',
      url: 'https://status.ipstream.com',
      icon: Globe,
      color: 'text-orange-400'
    }
  ]

  const getAvailabilityBadge = (availability: string) => {
    if (availability === '24/7') {
      return <Badge className="bg-green-600 text-white">24/7</Badge>
    } else {
      return <Badge className="bg-blue-600 text-white">{availability}</Badge>
    }
  }

  const getResponseTimeBadge = (time: string) => {
    const colors = {
      'Inmediato': 'bg-green-600',
      '5 minutos': 'bg-blue-600',
      '24 horas': 'bg-orange-600',
      'Autoservicio': 'bg-purple-600'
    }

    const color = colors[time as keyof typeof colors] || 'bg-gray-600'

    return <Badge className={`${color} text-white`}>{time}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Canales de Soporte */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Headphones className="h-5 w-5" />
            Canales de Soporte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {supportChannels.map((channel, index) => {
              const Icon = channel.icon
              return (
                <div key={index} className="p-4 rounded-lg bg-gray-700/50 border border-gray-600">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Icon className={`h-6 w-6 ${channel.color} mt-1`} />
                      <div className="flex-1">
                        <h4 className="text-white font-semibold mb-1">{channel.name}</h4>
                        <p className="text-sm text-gray-400 mb-3">{channel.description}</p>
                        
                        <div className="flex items-center gap-4 text-sm mb-3">
                          <div className="flex items-center gap-1 text-gray-300">
                            <span className="font-medium">Contacto:</span>
                            <span className="text-blue-400">{channel.contact}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-400">Respuesta:</span>
                            {getResponseTimeBadge(channel.responseTime)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">Disponibilidad:</span>
                            {getAvailabilityBadge(channel.availability)}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      onClick={channel.action}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Contactar
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recursos Adicionales */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Book className="h-5 w-5" />
            Recursos Adicionales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map((resource, index) => {
              const Icon = resource.icon
              return (
                <div key={index} className="p-4 rounded-lg bg-gray-700/50 border border-gray-600">
                  <div className="flex items-start gap-3 mb-3">
                    <Icon className={`h-5 w-5 ${resource.color} mt-1`} />
                    <div className="flex-1">
                      <h4 className="text-white font-semibold mb-1">{resource.title}</h4>
                      <p className="text-sm text-gray-400">{resource.description}</p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => window.open(resource.url, '_blank')}
                    size="sm"
                    variant="outline"
                    className="w-full border-gray-600 hover:bg-gray-700"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Acceder
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Información de Contacto de Emergencia */}
      <Card className="bg-red-500/10 border-red-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Phone className="h-5 w-5 text-red-400" />
            Contacto de Emergencia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-gray-300">
              Para problemas críticos que afecten la operación del sistema fuera del horario laboral:
            </p>
            
            <div className="flex items-center gap-4 p-3 rounded-lg bg-red-500/20">
              <Phone className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-white font-semibold">Línea de Emergencia 24/7</p>
                <p className="text-red-400 font-mono">+1 (555) 911-HELP</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-400">
              * Solo para emergencias críticas que afecten la disponibilidad del servicio
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}