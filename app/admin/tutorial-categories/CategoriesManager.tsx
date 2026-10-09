'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Edit, Trash2, Save, X, Tag } from 'lucide-react'

export interface AdminTutorialCategory {
  id: string
  name: string
  description: string | null
  order: number
  _count?: { tutorials: number }
}

interface CategoriesManagerProps {
  initialCategories: AdminTutorialCategory[]
}

export function CategoriesManager({ initialCategories }: CategoriesManagerProps) {
  const [categories, setCategories] = useState(initialCategories)
  const [editing, setEditing] = useState<AdminTutorialCategory | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', order: 0 })
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  )

  const startCreate = () => {
    setCreating(true)
    setEditing(null)
    setForm({ name: '', description: '', order: categories.length })
  }

  const startEdit = (c: AdminTutorialCategory) => {
    setCreating(false)
    setEditing(c)
    setForm({
      name: c.name,
      description: c.description ?? '',
      order: c.order,
    })
  }

  const cancel = () => {
    setCreating(false)
    setEditing(null)
    setForm({ name: '', description: '', order: 0 })
  }

  const handleSave = async () => {
    setSaving(true)
    setFeedback(null)
    try {
      const url = editing
        ? `/api/admin/tutorial-categories/${editing.id}`
        : '/api/admin/tutorial-categories'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          order: Number(form.order),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al guardar')
      }
      const data = await res.json()
      if (editing) {
        setCategories((prev) => prev.map((c) => (c.id === editing.id ? { ...c, ...data.category } : c)))
      } else {
        setCategories((prev) => [...prev, data.category])
      }
      setFeedback({ type: 'success', message: 'Categoría guardada' })
      cancel()
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al guardar',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (c: AdminTutorialCategory) => {
    if (
      !confirm(
        `¿Eliminar la categoría "${c.name}"? Los ${c._count?.tutorials ?? 0} tutorial(es) asociado(s) también se eliminarán.`
      )
    )
      return
    setFeedback(null)
    try {
      const res = await fetch(`/api/admin/tutorial-categories/${c.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al eliminar')
      }
      setCategories((prev) => prev.filter((x) => x.id !== c.id))
      setFeedback({ type: 'success', message: 'Categoría eliminada' })
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al eliminar',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Categorías de tutoriales</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Organiza los tutoriales en categorías como &quot;Primeros pasos&quot;, &quot;Contenido&quot;, &quot;Pagos&quot;, etc.
          </p>
        </div>
        {!creating && !editing && (
          <Button onClick={startCreate} className="bg-brand hover:bg-brand">
            <Plus className="h-4 w-4 mr-2" />
            Nueva categoría
          </Button>
        )}
      </div>

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

      {(creating || editing) && (
        <Card className="bg-card border-brand/50">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              {editing ? 'Editar categoría' : 'Nueva categoría'}
            </h3>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Nombre *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground"
                placeholder="Ej: Primeros pasos"
                maxLength={100}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground"
                rows={3}
                placeholder="Describe brevemente esta categoría"
                maxLength={1000}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Orden</label>
              <input
                type="number"
                min="0"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                className="w-32 bg-secondary border border-border rounded-lg px-3 py-2 text-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">Menor número aparece primero</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="bg-brand hover:bg-brand"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button onClick={cancel} variant="outline" className="border-border">
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No hay categorías creadas todavía.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {categories.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-3 p-4 hover:bg-secondary/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-brand flex-shrink-0" />
                      <h3 className="text-foreground font-semibold">{c.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                        {c._count?.tutorials ?? 0} tutorial
                        {(c._count?.tutorials ?? 0) === 1 ? '' : 'es'}
                      </span>
                      <span className="text-xs text-muted-foreground">orden: {c.order}</span>
                    </div>
                    {c.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(c)}
                      className="border-border"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(c)}
                      className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
