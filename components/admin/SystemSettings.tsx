'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Server, 
  Database, 
  Users, 
  FileText, 
  Clock, 
  HardDrive,
  Cpu,
  MemoryStick,
  Save,
  RefreshCw,
  Newspaper
} from 'lucide-react'

interface SystemStats {
  totalUsers: number
  totalClients: number
  totalContent: number
  databaseSize: string
  uptime: number
  nodeVersion: string
  platform: string
}

interface SystemSettingsProps {
  stats: SystemStats
}

export function SystemSettings({ stats }: SystemSettingsProps) {
  const [settings, setSettings] = useState({
    siteName: 'IPStream Panel',
    siteDescription: 'Panel de administración para clientes de radio streaming',
    maxUsersPerClient: 10,
    maxContentPerClient: 100,
    sessionTimeout: 24,
    maintenanceMode: false,
    debugMode: false,
    allowRegistration: true,
    enableGenericNews: false
  })

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/admin/app-config')
        if (res.ok) {
          const data = await res.json()
          setSettings(prev => ({ ...prev, enableGenericNews: data.enableGenericNews }))
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
        body: JSON.stringify({ enableGenericNews: settings.enableGenericNews })
      })

      if (response.ok) {
        alert('Configuración guardada exitosamente')
      } else {
        alert('Error al guardar la configuración')
      }
    } catch (error) {
      alert('Error al guardar la configuración')
    } finally {
      setLoading(false)
    }
  }

  const systemInfo = [
    { label: 'Total Usuarios', value: stats.totalUsers, icon: Users, color: 'text-blue-400' },
    { label: 'Total Clientes', value: stats.totalClients, icon: Users, color: 'text-green-400' },
    { label: 'Total Contenido', value: stats.totalContent, icon: FileText, color: 'text-purple-400' },
    { label: 'Tamaño BD', value: stats.databaseSize, icon: Database, color: 'text-orange-400' },
    { label: 'Tiempo Activo', value: formatUptime(stats.uptime), icon: Clock, color: 'text-cyan-400' },
    { label: 'Node.js', value: stats.nodeVersion, icon: Server, color: 'text-pink-400' }
  ]

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <p className="text-gray-400">Cargando configuración...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Información del Sistema */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Server className="h-5 w-5" />
            Información del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemInfo.map((info, index) => {
              const Icon = info.icon
              return (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-gray-700/50">
                  <Icon className={`h-5 w-5 ${info.color}`} />
                  <div>
                    <p className="text-sm text-gray-400">{info.label}</p>
                    <p className="text-white font-medium">{info.value}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Configuración General */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Configuración General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre del Sitio
              </label>
              <Input
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tiempo de Sesión (horas)
              </label>
              <Input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) || 24 })}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descripción del Sitio
            </label>
            <Input
              value={settings.siteDescription}
              onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Máx. Usuarios por Cliente
              </label>
              <Input
                type="number"
                value={settings.maxUsersPerClient}
                onChange={(e) => setSettings({ ...settings, maxUsersPerClient: parseInt(e.target.value) || 10 })}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Máx. Contenido por Cliente
              </label>
              <Input
                type="number"
                value={settings.maxContentPerClient}
                onChange={(e) => setSettings({ ...settings, maxContentPerClient: parseInt(e.target.value) || 100 })}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          {/* Switches de configuración */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
              <div>
                <p className="text-white font-medium">Modo Mantenimiento</p>
                <p className="text-sm text-gray-400">Desactiva el acceso para usuarios no administradores</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                  className="rounded border-gray-600 bg-gray-700"
                />
                <Badge className={settings.maintenanceMode ? "bg-red-600" : "bg-green-600"}>
                  {settings.maintenanceMode ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
              <div>
                <p className="text-white font-medium">Permitir Registro</p>
                <p className="text-sm text-gray-400">Permite que nuevos usuarios se registren</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.allowRegistration}
                  onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                  className="rounded border-gray-600 bg-gray-700"
                />
                <Badge className={settings.allowRegistration ? "bg-green-600" : "bg-red-600"}>
                  {settings.allowRegistration ? 'Permitido' : 'Bloqueado'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
              <div>
                <p className="text-white font-medium">Modo Debug</p>
                <p className="text-sm text-gray-400">Activa logs detallados para desarrollo</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.debugMode}
                  onChange={(e) => setSettings({ ...settings, debugMode: e.target.checked })}
                  className="rounded border-gray-600 bg-gray-700"
                />
                <Badge className={settings.debugMode ? "bg-yellow-600" : "bg-gray-600"}>
                  {settings.debugMode ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
              <div>
                <p className="text-white font-medium flex items-center gap-2">
                  <Newspaper className="h-4 w-4" />
                  Noticias Genéricas
                </p>
                <p className="text-sm text-gray-400">
                  Habilita la opción para que los clientes usen noticias globales del sistema
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.enableGenericNews}
                  onChange={(e) => setSettings({ ...settings, enableGenericNews: e.target.checked })}
                  className="rounded border-gray-600 bg-gray-700"
                />
                <Badge className={settings.enableGenericNews ? "bg-green-600" : "bg-gray-600"}>
                  {settings.enableGenericNews ? 'Activado' : 'Desactivado'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-gray-600 hover:bg-gray-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Recargar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
