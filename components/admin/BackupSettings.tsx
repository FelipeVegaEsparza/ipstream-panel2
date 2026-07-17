'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Database, 
  Download, 
  Upload, 
  Clock, 
  HardDrive,
  Cloud,
  Save,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Calendar
} from 'lucide-react'

export function BackupSettings() {
  const [settings, setSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily', // daily, weekly, monthly
    backupTime: '02:00',
    retentionDays: 30,
    includeUploads: true,
    includeDatabase: true,
    includeLogs: false,
    cloudBackup: false,
    cloudProvider: 'aws', // aws, google, azure
    cloudBucket: '',
    cloudAccessKey: '',
    cloudSecretKey: '',
    compressionEnabled: true,
    encryptionEnabled: true
  })

  const [loading, setLoading] = useState(false)
  const [backups] = useState([
    {
      id: '1',
      filename: 'backup_2024-07-16_02-00.zip',
      size: '45.2 MB',
      type: 'Automático',
      status: 'Completado',
      createdAt: new Date('2024-07-16T02:00:00'),
      location: 'Local'
    },
    {
      id: '2',
      filename: 'backup_2024-07-15_02-00.zip',
      size: '44.8 MB',
      type: 'Automático',
      status: 'Completado',
      createdAt: new Date('2024-07-15T02:00:00'),
      location: 'Local + Cloud'
    },
    {
      id: '3',
      filename: 'backup_manual_2024-07-14.zip',
      size: '43.9 MB',
      type: 'Manual',
      status: 'Completado',
      createdAt: new Date('2024-07-14T15:30:00'),
      location: 'Local'
    }
  ])

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/settings/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        alert('Configuración de respaldos guardada exitosamente')
      } else {
        alert('Error al guardar la configuración de respaldos')
      }
    } catch (error) {
      alert('Error al guardar la configuración de respaldos')
    } finally {
      setLoading(false)
    }
  }

  const createManualBackup = async () => {
    if (!confirm('¿Crear un respaldo manual ahora? Esto puede tomar varios minutos.')) return
    
    try {
      const response = await fetch('/api/admin/backup/create', {
        method: 'POST'
      })
      
      if (response.ok) {
        alert('Respaldo manual iniciado. Recibirás una notificación cuando termine.')
      } else {
        alert('Error al crear respaldo manual')
      }
    } catch (error) {
      alert('Error al crear respaldo manual')
    }
  }

  const downloadBackup = async (backupId: string, filename: string) => {
    try {
      const response = await fetch(`/api/admin/backup/download/${backupId}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Error al descargar respaldo')
      }
    } catch (error) {
      alert('Error al descargar respaldo')
    }
  }

  const restoreBackup = async (backupId: string) => {
    if (!confirm('¿Estás seguro de que quieres restaurar este respaldo? Esta acción no se puede deshacer.')) return
    
    try {
      const response = await fetch(`/api/admin/backup/restore/${backupId}`, {
        method: 'POST'
      })
      
      if (response.ok) {
        alert('Restauración iniciada. El sistema se reiniciará automáticamente.')
      } else {
        alert('Error al restaurar respaldo')
      }
    } catch (error) {
      alert('Error al restaurar respaldo')
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'Completado': { color: 'bg-green-600', icon: CheckCircle },
      'En Progreso': { color: 'bg-blue-600', icon: Clock },
      'Error': { color: 'bg-red-600', icon: AlertTriangle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['Error']
    const Icon = config.icon

    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Configuración de Respaldos Automáticos */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Respaldos Automáticos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
            <div>
              <p className="text-white font-medium">Respaldos Automáticos</p>
              <p className="text-sm text-gray-400">Crear respaldos de forma automática</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.autoBackup}
                onChange={(e) => setSettings({ ...settings, autoBackup: e.target.checked })}
                className="rounded border-gray-600 bg-gray-700"
              />
              <Badge className={settings.autoBackup ? "bg-green-600" : "bg-gray-600"}>
                {settings.autoBackup ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>

          {settings.autoBackup && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Frecuencia
                </label>
                <select
                  value={settings.backupFrequency}
                  onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2"
                >
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Hora de Respaldo
                </label>
                <Input
                  type="time"
                  value={settings.backupTime}
                  onChange={(e) => setSettings({ ...settings, backupTime: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Retención (días)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={settings.retentionDays}
                  onChange={(e) => setSettings({ ...settings, retentionDays: parseInt(e.target.value) || 30 })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-white font-medium">Contenido a Respaldar</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-400" />
                  <span className="text-white">Base de Datos</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.includeDatabase}
                  onChange={(e) => setSettings({ ...settings, includeDatabase: e.target.checked })}
                  className="rounded border-gray-600 bg-gray-700"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-green-400" />
                  <span className="text-white">Archivos Subidos</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.includeUploads}
                  onChange={(e) => setSettings({ ...settings, includeUploads: e.target.checked })}
                  className="rounded border-gray-600 bg-gray-700"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-purple-400" />
                  <span className="text-white">Logs del Sistema</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.includeLogs}
                  onChange={(e) => setSettings({ ...settings, includeLogs: e.target.checked })}
                  className="rounded border-gray-600 bg-gray-700"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuración de Nube */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Respaldos en la Nube
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
            <div>
              <p className="text-white font-medium">Respaldo en la Nube</p>
              <p className="text-sm text-gray-400">Sincronizar respaldos con servicios en la nube</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.cloudBackup}
                onChange={(e) => setSettings({ ...settings, cloudBackup: e.target.checked })}
                className="rounded border-gray-600 bg-gray-700"
              />
              <Badge className={settings.cloudBackup ? "bg-green-600" : "bg-gray-600"}>
                {settings.cloudBackup ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>

          {settings.cloudBackup && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Proveedor
                </label>
                <select
                  value={settings.cloudProvider}
                  onChange={(e) => setSettings({ ...settings, cloudProvider: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2"
                >
                  <option value="aws">Amazon S3</option>
                  <option value="google">Google Cloud Storage</option>
                  <option value="azure">Azure Blob Storage</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bucket/Contenedor
                </label>
                <Input
                  value={settings.cloudBucket}
                  onChange={(e) => setSettings({ ...settings, cloudBucket: e.target.value })}
                  placeholder="mi-bucket-respaldos"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Access Key
                </label>
                <Input
                  value={settings.cloudAccessKey}
                  onChange={(e) => setSettings({ ...settings, cloudAccessKey: e.target.value })}
                  placeholder="AKIA..."
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Secret Key
                </label>
                <Input
                  type="password"
                  value={settings.cloudSecretKey}
                  onChange={(e) => setSettings({ ...settings, cloudSecretKey: e.target.value })}
                  placeholder="••••••••"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial de Respaldos */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Historial de Respaldos
          </CardTitle>
          <Button
            onClick={createManualBackup}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Play className="h-4 w-4 mr-2" />
            Crear Respaldo Manual
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {backups.map((backup) => (
              <div key={backup.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-700/50 border border-gray-600">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-white font-medium">{backup.filename}</p>
                    {getStatusBadge(backup.status)}
                    <Badge variant="outline" className="border-gray-500 text-gray-300">
                      {backup.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-4 w-4" />
                      {backup.size}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(backup.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Cloud className="h-4 w-4" />
                      {backup.location}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadBackup(backup.id, backup.filename)}
                    className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => restoreBackup(backup.id)}
                    className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>
    </div>
  )
}