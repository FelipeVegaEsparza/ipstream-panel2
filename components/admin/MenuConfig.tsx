'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Save, Check, X } from 'lucide-react'
import { MENU_ITEMS, MENU_SECTIONS, type MenuItemKey } from '@/lib/menu-items'

export interface MenuConfigItem {
  key: MenuItemKey
  enabled: boolean
}

interface MenuConfigProps {
  clientId: string
  initialItems: MenuConfigItem[]
}

export function MenuConfig({ clientId, initialItems }: MenuConfigProps) {
  const [items, setItems] = useState<Record<MenuItemKey, boolean>>(() => {
    const map = {} as Record<MenuItemKey, boolean>
    for (const item of initialItems) {
      map[item.key] = item.enabled
    }
    return map
  })
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  )

  const toggle = (key: MenuItemKey, enabled: boolean) => {
    setItems((prev) => ({ ...prev, [key]: enabled }))
  }

  const setAllInSection = (section: string, enabled: boolean) => {
    setItems((prev) => {
      const next = { ...prev }
      for (const item of MENU_ITEMS) {
        if (item.section === section && !item.alwaysEnabled) {
          next[item.key] = enabled
        }
      }
      return next
    })
  }

  const setAll = (enabled: boolean) => {
    setItems((prev) => {
      const next = { ...prev }
      for (const item of MENU_ITEMS) {
        if (!item.alwaysEnabled) {
          next[item.key] = enabled
        }
      }
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/menu`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: MENU_ITEMS
            .filter((item) => !item.alwaysEnabled)
            .map((item) => ({ key: item.key, enabled: items[item.key] })),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al guardar')
      }
      setFeedback({ type: 'success', message: 'Menú actualizado correctamente' })
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al guardar',
      })
    } finally {
      setSaving(false)
    }
  }

  const enabledCount = Object.values(items).filter(Boolean).length
  const total = MENU_ITEMS.length

  const itemsBySection = MENU_SECTIONS.map((section) => ({
    name: section,
    items: MENU_ITEMS.filter((item) => item.section === section),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-lg bg-gray-700/40 border border-gray-600">
        <div>
          <p className="text-sm text-gray-400">
            Items visibles:{' '}
            <span className="text-white font-bold text-base">{enabledCount}</span>
            {' / '}
            <span className="text-gray-300">{total}</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Los cambios se aplican al cliente en su próxima navegación
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAll(true)}
            className="border-gray-600 hover:bg-gray-700 text-gray-300"
          >
            <Check className="h-3 w-3 mr-1" />
            Activar todo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAll(false)}
            className="border-gray-600 hover:bg-gray-700 text-gray-300"
          >
            <X className="h-3 w-3 mr-1" />
            Desactivar todo
          </Button>
        </div>
      </div>

      {itemsBySection.map((section) => {
        const sectionTotal = section.items.length
        const sectionEnabled = section.items.filter((i) => items[i.key]).length
        return (
          <div
            key={section.name}
            className="rounded-lg border border-gray-700 bg-gray-800/40 overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 bg-gray-700/30">
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                  {section.name}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {sectionEnabled} de {sectionTotal} activos
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAllInSection(section.name, true)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 px-2 py-1"
                >
                  Activar
                </button>
                <span className="text-gray-600">·</span>
                <button
                  type="button"
                  onClick={() => setAllInSection(section.name, false)}
                  className="text-xs text-gray-400 hover:text-gray-300 px-2 py-1"
                >
                  Desactivar
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-700">
              {section.items.map((item) => {
                const enabled = items[item.key] ?? true
                const locked = !!item.alwaysEnabled
                return (
                  <label
                    key={item.key}
                    className={`flex items-center justify-between p-4 ${
                      locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-700/30'
                    } transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-white font-medium">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.href}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {locked && (
                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                          Siempre
                        </span>
                      )}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        disabled={locked}
                        onClick={() => !locked && toggle(item.key, !enabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          enabled ? 'bg-cyan-600' : 'bg-gray-600'
                        } ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}

      {feedback && (
        <div
          className={`p-3 rounded-lg border text-sm ${
            feedback.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-cyan-600 hover:bg-cyan-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  )
}
