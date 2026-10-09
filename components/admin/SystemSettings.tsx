'use client'

import { showToast } from '@/components/ui/toast'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Server, Users, FileText, Clock, Save, Newspaper } from 'lucide-react'

interface SystemStats {
  totalUsers: number
  totalClients: number
  totalContent: number
  uptime: number
  nodeVersion: string
}

interface SystemSettingsProps {
  stats: SystemStats
}

export function SystemSettings({ stats }: SystemSettingsProps) {
  const [enableGenericNews, setEnableGenericNews] = useState(false)
  const [adminNotifyEmail, setAdminNotifyEmail] = useState('')
  const [trialDays, setTrialDays] = useState(7)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/admin/app-config')
        if (res.ok) {
          const data = await res.json()
          setEnableGenericNews(data.enableGenericNews)
          setAdminNotifyEmail(data.adminNotifyEmail || '')
          if (typeof data.trialDays === 'number') setTrialDays(data.trialDays)
        }
      } catch (error) {
        console.error('Error fetching app config:', error)
      } finally {
        setInitialLoading(false)
      }
    }
    fetchConfig()
  }, [])

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/app-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enableGenericNews, adminNotifyEmail: adminNotifyEmail.trim() || null, trialDays })
      })

      if (response.ok) {
        showToast({ type: 'success', title: 'Configuración guardada exitosamente' })
      } else {
        showToast({ type: 'error', title: 'Error al guardar la configuración' })
      }
    } catch (error) {
      showToast({ type: 'error', title: 'Error al guardar la configuración' })
    } finally {
      setLoading(false)
    }
  }

  const systemInfo = [
    { label: 'Total Usuarios', value: stats.totalUsers, icon: Users, color: 'text-brand' },
    { label: 'Total Clientes', value: stats.totalClients, icon: Users, color: 'text-green-400' },
    { label: 'Total Contenido', value: stats.totalContent, icon: FileText, color: 'text-purple-400' },
    { label: 'Tiempo Activo', value: formatUptime(stats.uptime), icon: Clock, color: 'text-brand' },
    { label: 'Node.js', value: stats.nodeVersion, icon: Server, color: 'text-pink-400' }
  ]

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <p className="text-muted-foreground">Cargando configuración...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Información del Sistema */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Server className="h-5 w-5" />
            Información del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemInfo.map((info, index) => {
              const Icon = info.icon
              return (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <Icon className={`h-5 w-5 ${info.color}`} />
                  <div>
                    <p className="text-sm text-muted-foreground">{info.label}</p>
                    <p className="text-foreground font-medium">{info.value}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Configuración General */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            Configuración General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div>
              <p className="text-foreground font-medium flex items-center gap-2">
                <Newspaper className="h-4 w-4" />
                Noticias Genéricas
              </p>
              <p className="text-sm text-muted-foreground">
                Habilita la opción para que los clientes usen noticias globales del sistema
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enableGenericNews}
                onChange={(e) => setEnableGenericNews(e.target.checked)}
                className="rounded border-border bg-secondary"
              />
              <Badge className={enableGenericNews ? "bg-green-600" : "bg-secondary"}>
                {enableGenericNews ? 'Activado' : 'Desactivado'}
              </Badge>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-secondary/50">
            <label className="block text-foreground font-medium mb-1">
              Email de notificaciones del panel
            </label>
            <input
              type="email"
              value={adminNotifyEmail}
              onChange={(e) => setAdminNotifyEmail(e.target.value)}
              placeholder="felipevegaesparza@gmail.com"
              className="w-full bg-background border border-border text-foreground rounded-md px-3 py-2 text-sm"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Recibe avisos de nuevos registros de clientes y otras notificaciones del sistema.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-secondary/50">
            <label className="block text-foreground font-medium mb-1">
              Días de prueba gratuita
            </label>
            <input
              type="number"
              min={0}
              max={365}
              value={trialDays}
              onChange={(e) => setTrialDays(Number(e.target.value))}
              className="w-full bg-background border border-border text-foreground rounded-md px-3 py-2 text-sm"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Días de prueba que reciben los clientes al registrarse desde las páginas públicas. 0 desactiva la prueba.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-brand hover:bg-brand"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
