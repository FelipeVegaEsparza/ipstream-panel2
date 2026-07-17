'use client'

import { useState, useEffect } from 'react'
import { useModal } from '@/components/ui/modal'

interface PushNotification {
  id: string
  title: string
  message: string
  imageUrl?: string | null
  targetUrl?: string | null
  scheduledFor?: string | null
  sentAt?: string | null
  status: string
  recipientsCount: number
  clicksCount: number
  createdAt: string
}

export function PushNotificationsManager() {
  const [notifications, setNotifications] = useState<PushNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    imageUrl: '',
    targetUrl: '',
    scheduledFor: '',
    sendNow: true
  })
  const [sending, setSending] = useState(false)
  const { showModal } = useModal()

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/dashboard/push-notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error('Error al cargar notificaciones:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)

    try {
      const response = await fetch('/api/dashboard/push-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          scheduledFor: formData.sendNow ? null : formData.scheduledFor
        })
      })

      const data = await response.json()

      if (response.ok) {
        if (data.error) {
          // Hubo un error al enviar pero se guardó
          showModal({
            type: 'warning',
            title: 'Notificación guardada con errores',
            message: data.message + '\n\nError: ' + data.error
          })
        } else {
          showModal({
            type: 'success',
            title: '¡Notificación enviada!',
            message: data.message || 'La notificación se ha enviado correctamente'
          })
        }
        setShowForm(false)
        setFormData({
          title: '',
          message: '',
          imageUrl: '',
          targetUrl: '',
          scheduledFor: '',
          sendNow: true
        })
        loadNotifications()
      } else {
        showModal({
          type: 'error',
          title: 'Error',
          message: data.error || 'No se pudo enviar la notificación'
        })
      }
    } catch (error) {
      showModal({
        type: 'error',
        title: 'Error',
        message: 'Error al enviar la notificación'
      })
    } finally {
      setSending(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      sent: 'bg-green-500/20 text-green-400 border-green-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30'
    }
    const labels = {
      pending: 'Pendiente',
      sent: 'Enviada',
      failed: 'Fallida'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs border ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return <div className="text-white">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Notificaciones Push
          </h1>
          <p className="text-gray-400">
            Envía notificaciones a los usuarios de tu PWA
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Notificación
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="card">
          <h3 className="text-xl font-semibold text-white mb-6">
            Crear Notificación
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group md:col-span-2">
                <label className="form-label">Título *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ej: Nueva noticia disponible"
                  required
                  maxLength={50}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {formData.title.length}/50 caracteres
                </p>
              </div>

              <div className="form-group md:col-span-2">
                <label className="form-label">Mensaje *</label>
                <textarea
                  className="form-input"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Ej: Tenemos una nueva noticia para ti. ¡No te la pierdas!"
                  required
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {formData.message.length}/200 caracteres
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">URL de Imagen (opcional)</label>
                <input
                  type="url"
                  className="form-input"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
              </div>

              <div className="form-group">
                <label className="form-label">URL de Destino (opcional)</label>
                <input
                  type="url"
                  className="form-input"
                  value={formData.targetUrl}
                  onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                  placeholder="https://ejemplo.com/noticia"
                />
              </div>
            </div>

            <div className="border-t border-gray-700 pt-6">
              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.sendNow}
                    onChange={() => setFormData({ ...formData, sendNow: true })}
                    className="text-cyan-500"
                  />
                  <span className="text-white">Enviar ahora</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!formData.sendNow}
                    onChange={() => setFormData({ ...formData, sendNow: false })}
                    className="text-cyan-500"
                  />
                  <span className="text-white">Programar envío</span>
                </label>
              </div>

              {!formData.sendNow && (
                <div className="form-group">
                  <label className="form-label">Fecha y hora de envío</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formData.scheduledFor}
                    onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                    required={!formData.sendNow}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={sending}
                className="btn-primary disabled:opacity-50"
              >
                {sending ? 'Enviando...' : (formData.sendNow ? 'Enviar Ahora' : 'Programar')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Historial */}
      <div className="card">
        <h3 className="text-xl font-semibold text-white mb-6">
          Historial de Notificaciones
        </h3>

        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-gray-400">No has enviado notificaciones aún</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div key={notification.id} className="glass-effect rounded-lg p-4 hover:bg-gray-700/30 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{notification.title}</h4>
                    <p className="text-gray-400 text-sm mt-1">{notification.message}</p>
                  </div>
                  {getStatusBadge(notification.status)}
                </div>
                
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {notification.sentAt ? formatDate(notification.sentAt) : 
                     notification.scheduledFor ? `Programada: ${formatDate(notification.scheduledFor)}` :
                     formatDate(notification.createdAt)}
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {notification.recipientsCount} destinatarios
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    {notification.clicksCount} clics
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
