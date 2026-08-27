'use client'

import { useRouter } from 'next/navigation'

import { showToast } from '@/components/ui/toast'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { X, Plus, Trash2 } from 'lucide-react'
import { MENU_ITEMS, MENU_SECTIONS } from '@/lib/menu-items'
import { ImageUpload } from '@/components/ui/ImageUpload'

interface Plan {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: string
  features: string
  isActive: boolean
  services: string
  radioStorageQuotaMB: number | null
  videoStorageQuotaMB: number | null
  menuHiddenKeys: string | null
  defaultServerId: string | null
  imageUrl: string | null
}

interface PlanFormProps {
  plan?: Plan | null
  onClose: () => void
}

export function PlanForm({ plan, onClose }: PlanFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    description: plan?.description || '',
    price: plan?.price || 0,
    currency: plan?.currency || 'CLP',
    interval: plan?.interval || 'monthly',
    isActive: plan?.isActive ?? true,
    services: plan?.services || 'both',
    radioStorageQuotaMB: plan?.radioStorageQuotaMB?.toString() || '',
    videoStorageQuotaMB: plan?.videoStorageQuotaMB?.toString() || '',
    defaultServerId: plan?.defaultServerId || '',
    imageUrl: plan?.imageUrl || '',
  })

  const [servers, setServers] = useState<{ id: string; name: string; type: string }[]>([])
  useEffect(() => {
    fetch('/api/admin/servers')
      .then((r) => r.json())
      .then((d) => setServers(d?.servers || []))
      .catch(() => {})
  }, [])

  const [features, setFeatures] = useState<string[]>(
    plan ? JSON.parse(plan.features || '[]') : ['']
  )

  // Secciones ocultas del plan (items del dashboard que NO incluye)
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() => {
    try {
      const arr = JSON.parse(plan?.menuHiddenKeys || '[]')
      return new Set<string>(Array.isArray(arr) ? arr.filter((x: unknown) => typeof x === 'string') : [])
    } catch {
      return new Set<string>()
    }
  })

  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = plan ? `/api/admin/plans/${plan.id}` : '/api/admin/plans'
      const method = plan ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          features: JSON.stringify(features.filter(f => f.trim() !== '')),
          radioStorageQuotaMB: formData.radioStorageQuotaMB === '' ? null : Number(formData.radioStorageQuotaMB),
          videoStorageQuotaMB: formData.videoStorageQuotaMB === '' ? null : Number(formData.videoStorageQuotaMB),
          menuHiddenKeys: Array.from(hiddenKeys),
        })
      })

      if (response.ok) {
        router.refresh()
      } else {
        const error = await response.json().catch(() => ({}))
        console.error('[PlanForm] save error', response.status, error)
        showToast({ type: 'error', title: error.message || error.error || 'Error al guardar el plan' })
      }
    } catch (error) {
      console.error('[PlanForm] save exception', error)
      showToast({ type: 'error', title: 'Error al guardar el plan' })
    } finally {
      setLoading(false)
    }
  }

  const addFeature = () => {
    setFeatures([...features, ''])
  }

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index))
  }

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...features]
    newFeatures[index] = value
    setFeatures(newFeatures)
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white">
          {plan ? 'Editar Plan' : 'Nuevo Plan'}
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          className="border-gray-600 hover:bg-gray-700"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre del Plan *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Plan Básico"
                required
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Precio *
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  required
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2"
                >
                  <option value="CLP">CLP (Peso Chileno)</option>
                  <option value="USD">USD (Dólar)</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descripción *
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe las características principales del plan"
              required
              className="bg-gray-700 border-gray-600 text-white"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Imagen del plan (para la página de registro)
            </label>
            <ImageUpload
              value={formData.imageUrl}
              onChange={(url) => setFormData({ ...formData, imageUrl: url })}
              onRemove={() => setFormData({ ...formData, imageUrl: '' })}
              label="Imagen del plan"
              description="Sube una imagen (JPG, PNG - Máx. 5MB)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Intervalo de Facturación *
            </label>
            <select
              value={formData.interval}
              onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2"
            >
              <option value="monthly">Mensual</option>
              <option value="yearly">Anual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Servicios incluidos *
            </label>
            <select
              value={formData.services}
              onChange={(e) => setFormData({ ...formData, services: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2"
            >
              <option value="both">Radio + TV</option>
              <option value="radio">Solo Radio</option>
              <option value="tv">Solo TV</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Determina qué servicios se crean al contratar este plan.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Servidor de streaming por defecto
            </label>
            <select
              value={formData.defaultServerId}
              onChange={(e) => setFormData({ ...formData, defaultServerId: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2"
            >
              <option value="">Servidor principal (global)</option>
              {servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.type === 'radio' ? 'Radio' : s.type === 'tv' ? 'TV' : 'Radio+TV'})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Los streams de los clientes que contraten este plan se crean en este servidor (ej. gratis → servidor A).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cuota de almacenamiento (vacío = ilimitado)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Radio (MB)</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.radioStorageQuotaMB}
                  onChange={(e) => setFormData({ ...formData, radioStorageQuotaMB: e.target.value })}
                  placeholder="ej: 5000 (5 GB)"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">TV / Video (MB)</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.videoStorageQuotaMB}
                  onChange={(e) => setFormData({ ...formData, videoStorageQuotaMB: e.target.value })}
                  placeholder="ej: 20000 (20 GB)"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Se aplica automáticamente a la biblioteca del cliente al contratar este plan (o al asignarlo).
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-300">
                Características del Plan
              </label>              <Button
                type="button"
                onClick={addFeature}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>
            
            <div className="space-y-2">
              {features.map((feature, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    placeholder="Ej: Hasta 10 programas"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  {features.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeFeature(index)}
                      size="sm"
                      variant="outline"
                      className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Secciones del dashboard incluidas en el plan
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Desmarcá las secciones que este plan NO incluye (para diferenciar precios). El resto se oculta
              automáticamente para los clientes de este plan.
            </p>
            <div className="space-y-4">
              {MENU_SECTIONS.map((section) => {
                const items = MENU_ITEMS.filter((i) => i.section === section)
                if (items.length === 0) return null
                return (
                  <div key={section} className="rounded-lg bg-gray-700/40 border border-gray-600 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-300 mb-2">{section}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {items.map((item) => {
                        const checked = !hiddenKeys.has(item.key)
                        const isServiceSection = section === 'Radio' || section === 'Televisión'
                        return (
                          <label
                            key={item.key}
                            className={`flex items-center gap-2 text-sm ${isServiceSection ? '' : 'text-gray-300'}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = new Set(hiddenKeys)
                                if (e.target.checked) next.delete(item.key)
                                else next.add(item.key)
                                setHiddenKeys(next)
                              }}
                              className="rounded border-gray-600 bg-gray-800"
                            />
                            <span className={checked ? 'text-gray-200' : 'text-gray-500 line-through'}>{item.name}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-600 bg-gray-700"
            />
            <label htmlFor="isActive" className="text-sm text-gray-300">
              Plan activo (disponible para nuevas suscripciones)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 flex-1"
            >
              {loading ? 'Guardando...' : (plan ? 'Actualizar Plan' : 'Crear Plan')}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="border-gray-600 hover:bg-gray-700"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}