'use client'

import { useState } from 'react'
import { Save, Check, X, Lock, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MENU_ITEMS, MENU_SECTIONS, type MenuItemKey } from '@/lib/menu-items'

interface GlobalMenuConfigProps {
  initialHidden: string[]
}

export function GlobalMenuConfig({ initialHidden }: GlobalMenuConfigProps) {
  const [hidden, setHidden] = useState<Set<MenuItemKey>>(
    () => new Set(initialHidden as MenuItemKey[])
  )
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  )

  const toggle = (key: MenuItemKey) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const setAllInSection = (section: string, value: boolean) => {
    setHidden((prev) => {
      const next = new Set(prev)
      for (const item of MENU_ITEMS) {
        if (item.section === section && !item.alwaysEnabled) {
          if (value) next.add(item.key)
          else next.delete(item.key)
          if (item.children) {
            for (const child of item.children) {
              if (value) next.add(child.key)
              else next.delete(child.key)
            }
          }
        }
      }
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/admin/global-menu', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: Array.from(hidden) }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || `Error ${res.status}`)
      }
      setFeedback({ type: 'success', message: 'Configuración guardada' })
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al guardar',
      })
    } finally {
      setSaving(false)
    }
  }

  const hiddenCount = hidden.size

  return (
    <div className="space-y-6">
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-sm text-amber-200 flex items-start gap-2">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div>
          <p>
            <strong>Override absoluto:</strong> los items ocultos globalmente no pueden ser re-mostrados por la
            configuración individual de un cliente.
          </p>
          {hiddenCount > 0 && (
            <p className="mt-1">
              {hiddenCount} item{hiddenCount === 1 ? '' : 's'} oculto{hiddenCount === 1 ? '' : 's'} para todos los clientes.
            </p>
          )}
        </div>
      </div>

      {MENU_SECTIONS.map((section) => {
        const items = MENU_ITEMS.filter((i) => i.section === section)
        return (
          <div key={section} className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm uppercase tracking-wide text-gray-400">{section}</h3>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setAllInSection(section, true)}
                  className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-red-600/30 hover:text-red-200 transition-colors"
                >
                  Ocultar todos
                </button>
                <button
                  type="button"
                  onClick={() => setAllInSection(section, false)}
                  className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-green-600/30 hover:text-green-200 transition-colors"
                >
                  Mostrar todos
                </button>
              </div>
            </div>
            <ul className="space-y-1">
              {items.map((item) => {
                const isLocked = !!item.alwaysEnabled
                const isHidden = hidden.has(item.key)
                return (
                  <li key={item.key}>
                    <div className="flex items-center justify-between p-2.5 rounded hover:bg-gray-700/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-white text-sm">{item.name}</span>
                        {isLocked && (
                          <span className="text-xs text-gray-500 flex items-center gap-1" title="Siempre visible">
                            <Lock className="h-3 w-3" /> siempre visible
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => !isLocked && toggle(item.key)}
                        disabled={isLocked}
                        aria-pressed={isHidden}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                          isHidden ? 'bg-red-600' : 'bg-gray-600'
                        } ${isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isHidden ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    {item.children && item.children.length > 0 && (
                      <div className="ml-6 space-y-0.5 border-l border-gray-700 pl-3">
                        {item.children.map((child) => {
                          const childHidden = hidden.has(child.key)
                          return (
                            <div key={child.key} className="flex items-center justify-between p-2 rounded hover:bg-gray-700/20">
                              <span className="text-gray-300 text-sm">{child.name}</span>
                              <button
                                type="button"
                                onClick={() => toggle(child.key)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                                  childHidden ? 'bg-red-600' : 'bg-gray-600'
                                } cursor-pointer hover:opacity-80`}
                              >
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                  childHidden ? 'translate-x-5' : 'translate-x-1'
                                }`} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>
        {feedback && (
          <span
            className={`text-sm flex items-center gap-1 ${
              feedback.type === 'success' ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
            {feedback.message}
          </span>
        )}
      </div>
    </div>
  )
}
