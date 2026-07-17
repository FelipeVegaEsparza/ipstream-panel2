'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone,
  AlertTriangle,
  CheckCircle,
  Save,
  Send,
  Settings
} from 'lucide-react'

export function NotificationSettings() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    webhookNotifications: false,
    
    // Email settings
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: 'noreply@ipstream.com',
    fromName: 'IPStream Panel',
    
    // Webhook settings
    webhookUrl: '',
    webhookSecret: '',
    
    // Notification types
    newUserRegistration: true,
    paymentReceived: true,
    subscriptionExpiring: true,
    systemErrors: true,
    securityAlerts: true,
    maintenanceMode: true,
    
    // Templates
    welcomeEmailTemplate: 'Bienvenido a IPStream Panel...',
    paymentConfirmationTemplate: 'Tu pago ha sido procesado exitosamente...',
    expirationWarningTemplate: 'Tu suscripción expira pronto...'
  })

  const [loading, setLoading] = useState(false)
  const [testEmail, setTestEmail] = useState('')

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/settings/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        alert('Configuración de notificaciones guardada exitosamente')
      } else {
        alert('Error al guardar la configuración de notificaciones')
      }
    } catch (error) {
      alert('Error al guardar la configuración de notificaciones')
    } finally {
      setLoading(false)
    }
  }

  const sendTestEmail = async () => {
    if (!testEmail) {
      alert('Por favor ingresa un email para la prueba')
      return
    }

    try {
      const response = await fetch('/api/admin/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      })

      if (response.ok) {
        alert('Email de prueba enviado exitosamente')
      } else {
        alert('Error al enviar email de prueba')
      }
    } catch (error) {
      alert('Error al enviar email de prueba')
    }
  }

  return (
    <div className="space-y-6">
      {/* Configuración General de Notificaciones */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Canales de Notificación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-white font-medium">Email</p>
                  <p className="text-sm text-gray-400">Notificaciones por correo</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                  className="rounded border-gray-600 bg-gray-700"
                />
                <Badge className={settings.emailNotifications ? "bg-green-600" : "bg-gray-600"}>
                  {settings.emailNotifications ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-green-400" />
                <div>
                  <p className="text-white font-medium">SMS</p>
                  <p className="text-sm text-gray-400">Mensajes de texto</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.smsNotifications}
                  onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
                  className="rounded border-gray-600 bg-gray-700"
                />
                <Badge className={settings.smsNotifications ? "bg-green-600" : "bg-gray-600"}>
                  {settings.smsNotifications ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-purple-400" />
                <div>
                  <p className="text-white font-medium">Push</p>
                  <p className="text-sm text-gray-400">Notificaciones push</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={(e) => setSettings({ ...settings, pushNotifications: e.target.checked })}
                  className="rounded border-gray-600 bg-gray-700"
                />
                <Badge className={settings.pushNotifications ? "bg-green-600" : "bg-gray-600"}>
                  {settings.pushNotifications ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-orange-400" />
                <div>
                  <p className="text-white font-medium">Webhook</p>
                  <p className="text-sm text-gray-400">Integraciones externas</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.webhookNotifications}
                  onChange={(e) => setSettings({ ...settings, webhookNotifications: e.target.checked })}
                  className="rounded border-gray-600 bg-gray-700"
                />
                <Badge className={settings.webhookNotifications ? "bg-green-600" : "bg-gray-600"}>
                  {settings.webhookNotifications ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuración de Email */}
      {settings.emailNotifications && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Configuración SMTP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Servidor SMTP
                </label>
                <Input
                  value={settings.smtpHost}
                  onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Puerto
                </label>
                <Input
                  type="number"
                  value={settings.smtpPort}
                  onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) || 587 })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Usuario SMTP
                </label>
                <Input
                  value={settings.smtpUser}
                  onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                  placeholder="tu-email@gmail.com"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contraseña SMTP
                </label>
                <Input
                  type="password"
                  value={settings.smtpPassword}
                  onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })}
                  placeholder="••••••••"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Remitente
                </label>
                <Input
                  value={settings.fromEmail}
                  onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
                  placeholder="noreply@tudominio.com"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre Remitente
                </label>
                <Input
                  value={settings.fromName}
                  onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
                  placeholder="IPStream Panel"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            {/* Test Email */}
            <div className="p-4 rounded-lg bg-gray-700/50 border border-gray-600">
              <h4 className="text-white font-medium mb-3">Probar Configuración</h4>
              <div className="flex gap-2">
                <Input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="email@ejemplo.com"
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Button
                  onClick={sendTestEmail}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Prueba
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tipos de Notificaciones */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Tipos de Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'newUserRegistration', label: 'Nuevo Usuario', desc: 'Cuando se registra un nuevo usuario', icon: CheckCircle },
              { key: 'paymentReceived', label: 'Pago Recibido', desc: 'Cuando se procesa un pago', icon: CheckCircle },
              { key: 'subscriptionExpiring', label: 'Suscripción Expirando', desc: 'Cuando una suscripción está por vencer', icon: AlertTriangle },
              { key: 'systemErrors', label: 'Errores del Sistema', desc: 'Cuando ocurren errores críticos', icon: AlertTriangle },
              { key: 'securityAlerts', label: 'Alertas de Seguridad', desc: 'Intentos de acceso sospechosos', icon: AlertTriangle },
              { key: 'maintenanceMode', label: 'Modo Mantenimiento', desc: 'Cuando se activa/desactiva mantenimiento', icon: Settings }
            ].map((notification) => {
              const Icon = notification.icon
              return (
                <div key={notification.key} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${notification.icon === AlertTriangle ? 'text-orange-400' : 'text-green-400'}`} />
                    <div>
                      <p className="text-white font-medium">{notification.label}</p>
                      <p className="text-sm text-gray-400">{notification.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings[notification.key as keyof typeof settings] as boolean}
                      onChange={(e) => setSettings({ ...settings, [notification.key]: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-700"
                    />
                    <Badge className={(settings[notification.key as keyof typeof settings] as boolean) ? "bg-green-600" : "bg-gray-600"}>
                      {(settings[notification.key as keyof typeof settings] as boolean) ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
              )
            })}
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