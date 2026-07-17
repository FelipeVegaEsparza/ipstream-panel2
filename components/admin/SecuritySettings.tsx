'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  Lock, 
  Key, 
  AlertTriangle, 
  Eye, 
  EyeOff,
  Save,
  RefreshCw,
  UserX,
  Clock
} from 'lucide-react'

export function SecuritySettings() {
  const [settings, setSettings] = useState({
    passwordMinLength: 8,
    requireSpecialChars: true,
    requireNumbers: true,
    requireUppercase: true,
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    sessionTimeout: 24,
    twoFactorAuth: false,
    ipWhitelist: '',
    allowedDomains: '',
    forcePasswordChange: 90,
    logSecurityEvents: true
  })

  const [loading, setLoading] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKey] = useState('sk_live_51234567890abcdef...')

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/settings/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        alert('Configuración de seguridad guardada exitosamente')
      } else {
        alert('Error al guardar la configuración de seguridad')
      }
    } catch (error) {
      alert('Error al guardar la configuración de seguridad')
    } finally {
      setLoading(false)
    }
  }

  const generateNewApiKey = async () => {
    if (!confirm('¿Estás seguro de que quieres generar una nueva API Key? La anterior dejará de funcionar.')) return
    
    try {
      const response = await fetch('/api/admin/settings/generate-api-key', {
        method: 'POST'
      })
      
      if (response.ok) {
        alert('Nueva API Key generada exitosamente')
        window.location.reload()
      } else {
        alert('Error al generar nueva API Key')
      }
    } catch (error) {
      alert('Error al generar nueva API Key')
    }
  }

  return (
    <div className="space-y-6">
      {/* Configuración de Contraseñas */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Políticas de Contraseñas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Longitud Mínima
              </label>
              <Input
                type="number"
                min="6"
                max="32"
                value={settings.passwordMinLength}
                onChange={(e) => setSettings({ ...settings, passwordMinLength: parseInt(e.target.value) || 8 })}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cambio Forzado (días)
              </label>
              <Input
                type="number"
                min="0"
                value={settings.forcePasswordChange}
                onChange={(e) => setSettings({ ...settings, forcePasswordChange: parseInt(e.target.value) || 90 })}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
              <div>
                <p className="text-white font-medium">Requerir Caracteres Especiales</p>
                <p className="text-sm text-gray-400">Obligar uso de símbolos (!@#$%^&*)</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.requireSpecialChars}
                  onChange={(e) => setSettings({ ...settings, requireSpecialChars: e.target.checked })}
                  className="rounded border-gray-600 bg-gray-700"
                />
                <Badge className={settings.requireSpecialChars ? "bg-green-600" : "bg-gray-600"}>
                  {settings.requireSpecialChars ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
              <div>
                <p className="text-white font-medium">Requerir Números</p>
                <p className="text-sm text-gray-400">Obligar uso de al menos un número</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.requireNumbers}
                  onChange={(e) => setSettings({ ...settings, requireNumbers: e.target.checked })}
                  className="rounded border-gray-600 bg-gray-700"
                />
                <Badge className={settings.requireNumbers ? "bg-green-600" : "bg-gray-600"}>
                  {settings.requireNumbers ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
              <div>
                <p className="text-white font-medium">Requerir Mayúsculas</p>
                <p className="text-sm text-gray-400">Obligar uso de al menos una mayúscula</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.requireUppercase}
                  onChange={(e) => setSettings({ ...settings, requireUppercase: e.target.checked })}
                  className="rounded border-gray-600 bg-gray-700"
                />
                <Badge className={settings.requireUppercase ? "bg-green-600" : "bg-gray-600"}>
                  {settings.requireUppercase ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuración de Acceso */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <UserX className="h-5 w-5" />
            Control de Acceso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Máx. Intentos de Login
              </label>
              <Input
                type="number"
                min="3"
                max="10"
                value={settings.maxLoginAttempts}
                onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) || 5 })}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Duración Bloqueo (min)
              </label>
              <Input
                type="number"
                min="5"
                value={settings.lockoutDuration}
                onChange={(e) => setSettings({ ...settings, lockoutDuration: parseInt(e.target.value) || 30 })}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              IPs Permitidas (separadas por comas)
            </label>
            <Input
              value={settings.ipWhitelist}
              onChange={(e) => setSettings({ ...settings, ipWhitelist: e.target.value })}
              placeholder="192.168.1.1, 10.0.0.1"
              className="bg-gray-700 border-gray-600 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">Dejar vacío para permitir todas las IPs</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Dominios de Email Permitidos
            </label>
            <Input
              value={settings.allowedDomains}
              onChange={(e) => setSettings({ ...settings, allowedDomains: e.target.value })}
              placeholder="empresa.com, cliente.org"
              className="bg-gray-700 border-gray-600 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">Dejar vacío para permitir todos los dominios</p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
            <div>
              <p className="text-white font-medium">Autenticación de Dos Factores</p>
              <p className="text-sm text-gray-400">Requerir 2FA para todos los usuarios</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.twoFactorAuth}
                onChange={(e) => setSettings({ ...settings, twoFactorAuth: e.target.checked })}
                className="rounded border-gray-600 bg-gray-700"
              />
              <Badge className={settings.twoFactorAuth ? "bg-green-600" : "bg-gray-600"}>
                {settings.twoFactorAuth ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Key className="h-5 w-5" />
            Gestión de API Keys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-700/50 border border-gray-600">
            <div className="flex-1">
              <p className="text-white font-medium mb-1">API Key Principal</p>
              <div className="flex items-center gap-2">
                <code className="text-sm text-gray-300 bg-gray-800 px-2 py-1 rounded">
                  {showApiKey ? apiKey : '••••••••••••••••••••••••••••••••'}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="border-gray-600 hover:bg-gray-700"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button
              onClick={generateNewApiKey}
              variant="outline"
              className="border-orange-600 text-orange-400 hover:bg-orange-600 hover:text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerar
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
            <div>
              <p className="text-white font-medium">Registrar Eventos de Seguridad</p>
              <p className="text-sm text-gray-400">Guardar logs de intentos de acceso y cambios</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.logSecurityEvents}
                onChange={(e) => setSettings({ ...settings, logSecurityEvents: e.target.checked })}
                className="rounded border-gray-600 bg-gray-700"
              />
              <Badge className={settings.logSecurityEvents ? "bg-green-600" : "bg-gray-600"}>
                {settings.logSecurityEvents ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
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
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="border-gray-600 hover:bg-gray-700"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Recargar
        </Button>
      </div>
    </div>
  )
}