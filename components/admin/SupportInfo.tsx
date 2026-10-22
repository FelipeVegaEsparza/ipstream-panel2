'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
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
  const { t } = useDashboardI18n()
  const supportChannels = [
    {
      name: t('admin.supportInfo.emailSupport'),
      description: t('admin.supportInfo.emailSupportDesc'),
      contact: 'soporte@casterfly.com',
      responseTime: t('admin.supportInfo.hours24'),
      availability: '24/7',
      icon: Mail,
      color: 'text-brand',
      action: () => window.open('mailto:soporte@casterfly.com', '_blank')
    },
    {
      name: t('admin.supportInfo.liveChat'),
      description: t('admin.supportInfo.liveChatDesc'),
      contact: 'casterfly.com/comunidad',
      responseTime: '5 min',
      availability: t('admin.supportInfo.businessHours'),
      icon: MessageCircle,
      color: 'text-green-400',
      action: () => window.open('https://casterfly.com/comunidad', '_blank')
    },
    {
      name: t('admin.supportInfo.phone'),
      description: t('admin.supportInfo.phoneDesc'),
      contact: '+1 (555) 123-4567',
      responseTime: t('admin.supportInfo.immediate'),
      availability: t('admin.supportInfo.businessHours'),
      icon: Phone,
      color: 'text-orange-400',
      action: () => window.open('tel:+15551234567', '_blank')
    },
    {
      name: t('admin.supportInfo.helpCenter'),
      description: t('admin.supportInfo.helpCenterDesc'),
      contact: 'casterfly.com/tutoriales',
      responseTime: t('admin.supportInfo.autoservice'),
      availability: '24/7',
      icon: Book,
      color: 'text-purple-400',
      action: () => window.open('https://casterfly.com/tutoriales', '_blank')
    }
  ]

  const resources = [
    {
      title: t('admin.supportInfo.apiDocs'),
      description: t('admin.supportInfo.apiDocsDesc'),
      url: 'https://casterfly.com/soporte',
      icon: FileText,
      color: 'text-brand'
    },
    {
      title: t('admin.supportInfo.videoTutorials'),
      description: t('admin.supportInfo.videoTutorialsDesc'),
      url: 'https://casterfly.com/tutoriales',
      icon: Video,
      color: 'text-red-400'
    },
    {
      title: t('admin.supportInfo.communityForum'),
      description: t('admin.supportInfo.communityForumDesc'),
      url: 'https://casterfly.com/comunidad',
      icon: MessageCircle,
      color: 'text-green-400'
    },
    {
      title: t('admin.supportInfo.serviceStatus'),
      description: t('admin.supportInfo.serviceStatusDesc'),
      url: 'https://casterfly.com/soporte',
      icon: Globe,
      color: 'text-orange-400'
    }
  ]

  const getAvailabilityBadge = (availability: string) => {
    if (availability === '24/7') {
      return <Badge className="bg-green-600 text-white">24/7</Badge>
    } else {
      return <Badge className="bg-brand text-white">{availability}</Badge>
    }
  }

  const getResponseTimeBadge = (time: string) => {
    const colors = {
      [t('admin.supportInfo.immediate')]: 'bg-green-600',
      '5 min': 'bg-brand',
      [t('admin.supportInfo.hours24')]: 'bg-orange-600',
      [t('admin.supportInfo.autoservice')]: 'bg-purple-600'
    }

    const color = colors[time as keyof typeof colors] || 'bg-secondary'

    return <Badge className={`${color} text-foreground`}>{time}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Canales de Soporte */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Headphones className="h-5 w-5" />
            {t('admin.supportInfo.supportChannels')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {supportChannels.map((channel, index) => {
              const Icon = channel.icon
              return (
                <div key={index} className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Icon className={`h-6 w-6 ${channel.color} mt-1`} />
                      <div className="flex-1">
                        <h4 className="text-foreground font-semibold mb-1">{channel.name}</h4>
                        <p className="text-sm text-muted-foreground mb-3">{channel.description}</p>
                        
                        <div className="flex items-center gap-4 text-sm mb-3">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span className="font-medium">{t('admin.supportInfo.contact')}</span>
                            <span className="text-brand">{channel.contact}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{t('admin.supportInfo.response')}</span>
                            {getResponseTimeBadge(channel.responseTime)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{t('admin.supportInfo.availability')}</span>
                            {getAvailabilityBadge(channel.availability)}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      onClick={channel.action}
                      size="sm"
                      className="bg-brand hover:bg-brand"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {t('admin.supportInfo.contactAction')}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recursos Adicionales */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Book className="h-5 w-5" />
            {t('admin.supportInfo.additionalResources')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map((resource, index) => {
              const Icon = resource.icon
              return (
                <div key={index} className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <div className="flex items-start gap-3 mb-3">
                    <Icon className={`h-5 w-5 ${resource.color} mt-1`} />
                    <div className="flex-1">
                      <h4 className="text-foreground font-semibold mb-1">{resource.title}</h4>
                      <p className="text-sm text-muted-foreground">{resource.description}</p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => window.open(resource.url, '_blank')}
                    size="sm"
                    variant="outline"
                    className="w-full border-border hover:bg-secondary"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t('admin.supportInfo.access')}
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
          <CardTitle className="text-foreground flex items-center gap-2">
            <Phone className="h-5 w-5 text-red-400" />
            {t('admin.supportInfo.emergencyContact')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-muted-foreground">
              {t('admin.supportInfo.emergencyHint')}
            </p>
            
            <div className="flex items-center gap-4 p-3 rounded-lg bg-red-500/20">
              <Phone className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-foreground font-semibold">{t('admin.supportInfo.emergencyLine')}</p>
                <p className="text-red-400 font-mono">+1 (555) 911-HELP</p>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {t('admin.supportInfo.emergencyNote')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}