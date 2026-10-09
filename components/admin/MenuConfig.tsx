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
          if (item.children) {
            for (const child of item.children) {
              next[child.key] = enabled
            }
          }
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
      const allItems = MENU_ITEMS.flatMap((item) => {
        const parent = item.alwaysEnabled ? [] : [{ key: item.key, enabled: items[item.key] }]
        const children = item.children?.map((c) => ({ key: c.key, enabled: items[c.key] })) ?? []
        return [...parent, ...children]
      })
      const res = await fetch(`/api/admin/clients/${clientId}/menu`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: allItems }),
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
      <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-lg bg-secondary/40 border border-border">
        <div>
          <p className="text-sm text-muted-foreground">
            Items visibles:{' '}
            <span className="text-foreground font-bold text-base">{enabledCount}</span>
            {' / '}
            <span className="text-muted-foreground">{total}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Los cambios se aplican al cliente en su próxima navegación
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAll(true)}
            className="border-border hover:bg-secondary text-muted-foreground"
          >
            <Check className="h-3 w-3 mr-1" />
            Activar todo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAll(false)}
            className="border-border hover:bg-secondary text-muted-foreground"
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
            className="rounded-lg border border-border bg-card/40 overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 bg-secondary/30">
              <div>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  {section.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {sectionEnabled} de {sectionTotal} activos
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAllInSection(section.name, true)}
                  className="text-xs text-brand hover:text-brand px-2 py-1"
                >
                  Activar
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={() => setAllInSection(section.name, false)}
                  className="text-xs text-muted-foreground hover:text-muted-foreground px-2 py-1"
                >
                  Desactivar
                </button>
              </div>
            </div>

            <div className="divide-y divide-border">
              {section.items.map((item) => {
                const enabled = items[item.key] ?? true
                const locked = !!item.alwaysEnabled
                return (
                  <div key={item.key}>
                    <label
                      className={`flex items-center justify-between p-4 ${
                        locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-secondary/30'
                      } transition-colors`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-foreground font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.href}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {locked && (
                          <span className="text-xs text-muted-foreground uppercase tracking-wide">Siempre</span>
                        )}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={enabled}
                          disabled={locked}
                          onClick={() => !locked && toggle(item.key, !enabled)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            enabled ? 'bg-brand' : 'bg-secondary'
                          } ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            enabled ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>
                    </label>
                    {item.children && item.children.length > 0 && (
                      <div className="border-t border-border/50">
                        {item.children.map((child) => {
                          const childEnabled = items[child.key] ?? true
                          return (
                            <label
                              key={child.key}
                              className="flex items-center justify-between py-3 pl-14 pr-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <child.icon className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-foreground text-sm">{child.name}</p>
                                  <p className="text-xs text-muted-foreground">{child.href}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={childEnabled}
                                onClick={() => toggle(child.key, !childEnabled)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                  childEnabled ? 'bg-brand' : 'bg-secondary'
                                } cursor-pointer`}
                              >
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                  childEnabled ? 'translate-x-5' : 'translate-x-1'
                                }`} />
                              </button>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
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
          className="bg-brand hover:bg-brand"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  )
}
