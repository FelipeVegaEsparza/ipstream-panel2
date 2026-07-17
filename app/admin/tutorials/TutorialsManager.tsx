'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Edit, Trash2, Save, X, PlayCircle, Eye, EyeOff, Filter } from 'lucide-react'
import {
  extractYouTubeId,
  getYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
  getYouTubeThumbnailFallbackUrl,
} from '@/lib/youtube'

export interface AdminTutorial {
  id: string
  title: string
  description: string | null
  youtubeUrl: string
  categoryId: string
  order: number
  isPublished: boolean
  category: { id: string; name: string }
}

interface AdminTutorialCategory {
  id: string
  name: string
}

interface TutorialsManagerProps {
  initialTutorials: AdminTutorial[]
  initialCategories: AdminTutorialCategory[]
}

export function TutorialsManager({
  initialTutorials,
  initialCategories,
}: TutorialsManagerProps) {
  const [tutorials, setTutorials] = useState(initialTutorials)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [editing, setEditing] = useState<AdminTutorial | null>(null)
  const [creating, setCreating] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [thumbErrors, setThumbErrors] = useState<Record<string, boolean>>({})
  const [form, setForm] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    categoryId: initialCategories[0]?.id ?? '',
    order: 0,
    isPublished: true,
  })
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  )

  const videoId = useMemo(() => extractYouTubeId(form.youtubeUrl), [form.youtubeUrl])
  const isValidUrl = !!videoId

  const filtered = useMemo(() => {
    if (filterCategory === 'all') return tutorials
    return tutorials.filter((t) => t.categoryId === filterCategory)
  }, [filterCategory, tutorials])

  const startCreate = () => {
    setCreating(true)
    setEditing(null)
    setForm({
      title: '',
      description: '',
      youtubeUrl: '',
      categoryId: initialCategories[0]?.id ?? '',
      order: tutorials.length,
      isPublished: true,
    })
  }

  const startEdit = (t: AdminTutorial) => {
    setCreating(false)
    setEditing(t)
    setForm({
      title: t.title,
      description: t.description ?? '',
      youtubeUrl: t.youtubeUrl,
      categoryId: t.categoryId,
      order: t.order,
      isPublished: t.isPublished,
    })
  }

  const cancel = () => {
    setCreating(false)
    setEditing(null)
    setPreviewOpen(false)
    setForm({
      title: '',
      description: '',
      youtubeUrl: '',
      categoryId: initialCategories[0]?.id ?? '',
      order: 0,
      isPublished: true,
    })
  }

  const handleSave = async () => {
    if (!isValidUrl) {
      setFeedback({ type: 'error', message: 'URL de YouTube inválida' })
      return
    }
    setSaving(true)
    setFeedback(null)
    try {
      const url = editing ? `/api/admin/tutorials/${editing.id}` : '/api/admin/tutorials'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          youtubeUrl: form.youtubeUrl,
          categoryId: form.categoryId,
          order: Number(form.order),
          isPublished: form.isPublished,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al guardar')
      }
      const data = await res.json()
      if (editing) {
        setTutorials((prev) => prev.map((t) => (t.id === editing.id ? data.tutorial : t)))
      } else {
        setTutorials((prev) => [data.tutorial, ...prev])
      }
      setFeedback({ type: 'success', message: 'Tutorial guardado' })
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

  const handleDelete = async (t: AdminTutorial) => {
    if (!confirm(`¿Eliminar el tutorial "${t.title}"?`)) return
    setFeedback(null)
    try {
      const res = await fetch(`/api/admin/tutorials/${t.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al eliminar')
      }
      setTutorials((prev) => prev.filter((x) => x.id !== t.id))
      setFeedback({ type: 'success', message: 'Tutorial eliminado' })
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al eliminar',
      })
    }
  }

  if (initialCategories.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-800/40 rounded-xl border border-dashed border-gray-600">
        <p className="text-white font-medium mb-2">No hay categorías creadas</p>
        <p className="text-sm text-gray-400 mb-4">
          Crea al menos una categoría antes de agregar tutoriales.
        </p>
        <a
          href="/admin/tutorial-categories"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700"
        >
          Ir a Categorías
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Tutoriales</h2>
          <p className="text-sm text-gray-400 mt-1">
            Crea tutoriales con videos de YouTube para tus clientes
          </p>
        </div>
        {!creating && !editing && (
          <Button onClick={startCreate} className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo tutorial
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
        <Card className="bg-gray-800 border-cyan-500/50">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">
              {editing ? 'Editar tutorial' : 'Nuevo tutorial'}
            </h3>

            <div>
              <label className="text-sm text-gray-300 block mb-1">Título *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                placeholder="Ej: Cómo crear tu primera noticia"
                maxLength={200}
              />
            </div>

            <div>
              <label className="text-sm text-gray-300 block mb-1">URL de YouTube *</label>
              <input
                type="url"
                value={form.youtubeUrl}
                onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-white ${
                  form.youtubeUrl && !isValidUrl
                    ? 'border-red-500'
                    : isValidUrl
                    ? 'border-green-500'
                    : 'border-gray-600'
                }`}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              {form.youtubeUrl && !isValidUrl && (
                <p className="text-red-400 text-xs mt-1">
                  URL de YouTube inválida. Usa un enlace válido de youtube.com o youtu.be
                </p>
              )}
              {isValidUrl && (
                <p className="text-green-400 text-xs mt-1">
                  ✓ Video detectado (ID: {videoId})
                </p>
              )}
            </div>

            {isValidUrl && (
              <div>
                <label className="text-sm text-gray-300 block mb-2">Vista previa</label>
                {previewOpen && (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden mb-2">
                    <iframe
                      src={getYouTubeEmbedUrl(videoId!)}
                      title="Preview"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                )}
                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                  <img
                    src={
                      thumbErrors['_new']
                        ? getYouTubeThumbnailFallbackUrl(videoId!)
                        : getYouTubeThumbnailUrl(videoId!)
                    }
                    alt="Preview"
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={() => setThumbErrors((p) => ({ ...p, _new: true }))}
                  />
                  <button
                    type="button"
                    onClick={() => setPreviewOpen((v) => !v)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors text-white"
                  >
                    <PlayCircle className="h-12 w-12" />
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm text-gray-300 block mb-1">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                rows={3}
                placeholder="Describe brevemente el contenido del tutorial"
                maxLength={2000}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300 block mb-1">Categoría *</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  {initialCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">Orden</label>
                <input
                  type="number"
                  min="0"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                  className="w-32 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                className="rounded border-gray-600 bg-gray-700"
              />
              Publicado (visible para los clientes)
            </label>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={saving || !isValidUrl || !form.title.trim() || !form.categoryId}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button onClick={cancel} variant="outline" className="border-gray-600">
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-0">
          <div className="p-4 border-b border-gray-700 flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-400">Filtrar:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
            >
              <option value="all">Todas las categorías ({tutorials.length})</option>
              {initialCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({tutorials.filter((t) => t.categoryId === c.id).length})
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-12">
              {tutorials.length === 0
                ? 'No hay tutoriales creados.'
                : 'No hay tutoriales en esta categoría.'}
            </p>
          ) : (
            <ul className="divide-y divide-gray-700">
              {filtered.map((t) => {
                const tVideoId = extractYouTubeId(t.youtubeUrl)
                const thumb = tVideoId
                  ? thumbErrors[t.id]
                    ? getYouTubeThumbnailFallbackUrl(tVideoId)
                    : getYouTubeThumbnailUrl(tVideoId)
                  : null
                return (
                  <li
                    key={t.id}
                    className="flex items-start gap-3 p-4 hover:bg-gray-700/30"
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={t.title}
                        className="w-32 h-20 object-cover rounded flex-shrink-0"
                        onError={() =>
                          setThumbErrors((prev) => ({ ...prev, [t.id]: true }))
                        }
                      />
                    ) : (
                      <div className="w-32 h-20 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                        <PlayCircle className="h-8 w-8 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-semibold">{t.title}</h3>
                        {t.isPublished ? (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-600/20 text-green-300 border border-green-600/30 inline-flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            Publicado
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-600/20 text-gray-300 border border-gray-600/30 inline-flex items-center gap-1">
                            <EyeOff className="h-3 w-3" />
                            Borrador
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-cyan-400 mt-0.5">{t.category.name}</p>
                      {t.description && (
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                          {t.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(t)}
                        className="border-gray-600"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(t)}
                        className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
