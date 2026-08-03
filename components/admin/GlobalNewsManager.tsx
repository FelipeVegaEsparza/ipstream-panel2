'use client'

import { showToast } from '@/components/ui/toast'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { normalizeImageUrl } from '@/lib/image-url-helper'
import Image from 'next/image'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
}

interface GlobalNewsItem {
  id: string
  name: string
  slug: string
  shortText: string
  longText: string
  imageUrl: string | null
  imageSource: string | null
  status: 'draft' | 'published'
  source: 'manual' | 'ai'
  aiRunId: string | null
  createdAt: string
  category: Category
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface GenerateResult {
  runId: string
  totalCreated: number
  byCategory: Array<{
    categoryId: string
    categoryName: string
    requested: number
    created: number
  }>
  newsContext?: {
    source: string
    count: number
    firstPublishedAt: string
    lastPublishedAt: string
  } | null
}

export function GlobalNewsManager() {
  const [published, setPublished] = useState<GlobalNewsItem[]>([])
  const [drafts, setDrafts] = useState<GlobalNewsItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [publishedPagination, setPublishedPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 })
  const [draftsPagination, setDraftsPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 })
  const [tab, setTab] = useState<'published' | 'drafts'>('published')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [form, setForm] = useState({
    categoryId: '',
    name: '',
    slug: '',
    shortText: '',
    longText: '',
    imageUrl: '',
  })
  const [saving, setSaving] = useState(false)

  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [countPerCategory, setCountPerCategory] = useState(3)
  const [generating, setGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null)

  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([])
  const [bulkApproving, setBulkApproving] = useState(false)

  const fetchPublished = async (page = 1) => {
    try {
      let url = `/api/admin/news-global?status=published&page=${page}&limit=20`
      if (filterCategory) url += `&categoryId=${filterCategory}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setPublished(data.data)
        setPublishedPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching published news:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDrafts = async (page = 1) => {
    try {
      let url = `/api/admin/news-global?status=draft&page=${page}&limit=50`
      if (filterCategory) url += `&categoryId=${filterCategory}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setDrafts(data.data)
        setDraftsPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching drafts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/news-categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  useEffect(() => {
    fetchCategories()
    fetchPublished()
    fetchDrafts()
  }, [])

  useEffect(() => {
    fetchPublished(1)
    fetchDrafts(1)
    setSelectedDraftIds([])
  }, [filterCategory])

  const categoriesWithCount = useMemo(
    () =>
      categories.map((c) => ({
        ...c,
        newsCount: ((c as Category & { _count?: { news: number } })._count?.news ?? 0),
      })),
    [categories]
  )

  const draftsByRun = useMemo(() => {
    const map = new Map<string, GlobalNewsItem[]>()
    for (const d of drafts) {
      if (d.aiRunId) {
        const arr = map.get(d.aiRunId) ?? []
        arr.push(d)
        map.set(d.aiRunId, arr)
      }
    }
    const manual = drafts.filter((d) => !d.aiRunId)
    if (manual.length > 0) map.set('__manual__', manual)
    return map
  }, [drafts])

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const handleNameChange = (name: string) => {
    setForm((prev) => ({ ...prev, name, slug: editingId ? prev.slug : generateSlug(name) }))
  }

  const handleEdit = (item: GlobalNewsItem) => {
    setForm({
      categoryId: item.category.id,
      name: item.name,
      slug: item.slug,
      shortText: item.shortText,
      longText: item.longText,
      imageUrl: item.imageUrl || '',
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta noticia global?')) return
    try {
      const res = await fetch(`/api/admin/news-global/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchPublished(publishedPagination.page)
        fetchDrafts(draftsPagination.page)
      } else showToast({ type: 'error', title: 'Error al eliminar' })
    } catch {
      showToast({ type: 'error', title: 'Error al eliminar' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = editingId ? `/api/admin/news-global/${editingId}` : '/api/admin/news-global'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, imageUrl: form.imageUrl || undefined }),
      })
      if (res.ok) {
        setShowForm(false)
        setEditingId(null)
        setForm({ categoryId: '', name: '', slug: '', shortText: '', longText: '', imageUrl: '' })
        fetchPublished(1)
        fetchDrafts(1)
      } else {
        const data = await res.json()
        showToast({ type: 'error', title: data.error || 'Error al guardar' })
      }
    } catch {
      showToast({ type: 'error', title: 'Error al guardar' })
    } finally {
      setSaving(false)
    }
  }

  const openGenerateModal = () => {
    setSelectedCategoryIds(categoriesWithCount.map((c) => c.id))
    setCountPerCategory(3)
    setGenerateResult(null)
    setGenerateError(null)
    setShowGenerateModal(true)
  }

  const [generateError, setGenerateError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (selectedCategoryIds.length === 0) return
    setGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch('/api/admin/news-global/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryIds: selectedCategoryIds, countPerCategory }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGenerateError(data.error || 'Error al generar noticias')
        return
      }
      setGenerateResult(data)
      await fetchDrafts(1)
      setTab('drafts')
    } catch {
      setGenerateError('Error de red al generar noticias')
    } finally {
      setGenerating(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/news-global/${id}/approve`, { method: 'POST' })
      if (res.ok) {
        fetchDrafts(draftsPagination.page)
        fetchPublished(publishedPagination.page)
        setSelectedDraftIds((prev) => prev.filter((x) => x !== id))
      } else {
        const data = await res.json()
        showToast({ type: 'error', title: data.error || 'Error al aprobar' })
      }
    } catch {
      showToast({ type: 'error', title: 'Error al aprobar' })
    }
  }

  const handleApproveBatch = async (ids: string[]) => {
    if (ids.length === 0) return
    if (!confirm(`¿Aprobar ${ids.length} borrador(es)? Quedarán publicados.`)) return
    setBulkApproving(true)
    try {
      const res = await fetch('/api/admin/news-global/approve-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const data = await res.json()
      if (res.ok) {
        fetchDrafts(draftsPagination.page)
        fetchPublished(publishedPagination.page)
        setSelectedDraftIds([])
        showToast({ type: 'success', title: `${data.approved} borrador(es) aprobado(s)` })
      } else {
        showToast({ type: 'error', title: data.error || 'Error al aprobar' })
      }
    } catch {
      showToast({ type: 'error', title: 'Error al aprobar' })
    } finally {
      setBulkApproving(false)
    }
  }

  const handleDiscardRun = async (runId: string) => {
    if (runId === '__manual__') {
      if (!confirm('¿Eliminar todos los borradores sin run asignado?')) return
      for (const d of (draftsByRun.get('__manual__') ?? [])) {
        await fetch(`/api/admin/news-global/${d.id}`, { method: 'DELETE' })
      }
      fetchDrafts(1)
      return
    }
    if (!confirm('¿Descartar todos los borradores de este lote?')) return
    try {
      const res = await fetch(`/api/admin/news-global/run/${runId}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        showToast({ type: 'success', title: `${data.deleted} borrador(es) eliminado(s)` })
        fetchDrafts(1)
        setSelectedDraftIds([])
      } else {
        showToast({ type: 'error', title: data.error || 'Error al descartar' })
      }
    } catch {
      showToast({ type: 'error', title: 'Error al descartar' })
    }
  }

  const toggleDraftSelection = (id: string) => {
    setSelectedDraftIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))

  const formatContextDate = (date: string) =>
    new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))

  if (loading) return <p className="text-gray-400">Cargando noticias globales...</p>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Noticias Genéricas</h2>
          <p className="text-sm text-gray-400">
            {publishedPagination.total} publicadas · {draftsPagination.total} borradores
          </p>
        </div>
        {!showForm && (
          <div className="flex gap-2">
            <Button
              onClick={openGenerateModal}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={categories.length === 0}
              title={categories.length === 0 ? 'Crea categorías primero' : 'Generar borradores con IA'}
            >
              <SparklesIcon className="h-4 w-4 mr-2" /> Generar con IA
            </Button>
            <Button
              onClick={() => {
                setShowForm(true)
                setEditingId(null)
                setForm({ categoryId: '', name: '', slug: '', shortText: '', longText: '', imageUrl: '' })
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" /> Nueva Noticia
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        {filterCategory && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setFilterCategory('')}
            className="border-gray-600 hover:bg-gray-700"
          >
            <XMarkIcon className="h-4 w-4 mr-1" /> Limpiar filtro
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-medium text-white">
            {editingId ? 'Editar Noticia Genérica' : 'Nueva Noticia Genérica'}
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Categoría</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 w-full"
              required
            >
              <option value="">Seleccionar categoría...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Título</label>
              <Input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Slug</label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>
          </div>

          <div>
            <ImageUpload
              label="Imagen de la Noticia"
              description="Imagen principal de la noticia (JPG, PNG, GIF, WebP - Máx. 5MB)"
              value={form.imageUrl}
              onChange={(url) => setForm({ ...form, imageUrl: url })}
              onRemove={() => setForm({ ...form, imageUrl: '' })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Texto Corto</label>
            <textarea
              value={form.shortText}
              onChange={(e) => setForm({ ...form, shortText: e.target.value })}
              className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 w-full min-h-[80px]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Texto Largo</label>
            <textarea
              value={form.longText}
              onChange={(e) => setForm({ ...form, longText: e.target.value })}
              className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 w-full min-h-[150px]"
              required
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowForm(false); setEditingId(null) }}
              className="border-gray-600 hover:bg-gray-700"
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 text-purple-400" />
                  Generar borradores con IA
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  DeepSeek generará borradores en español, inspirados en titulares actuales de GNews. Si GNews no responde, no se creará ningún borrador.
                </p>
              </div>
              <button
                onClick={() => { setShowGenerateModal(false); setGenerateError(null); setGenerateResult(null) }}
                className="text-gray-400 hover:text-white"
                disabled={generating}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {generateResult ? (
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-gray-700/50 border border-gray-600">
                  <p className="text-white font-medium">
                    {generateResult.totalCreated} borrador(es) creado(s)
                  </p>
                  {generateResult.newsContext && (
                    <p className="text-xs text-gray-400 mt-1">
                      Contexto: {generateResult.newsContext.count} titulares de {generateResult.newsContext.source === 'gnews' ? 'GNews' : generateResult.newsContext.source} · {formatContextDate(generateResult.newsContext.firstPublishedAt)} – {formatContextDate(generateResult.newsContext.lastPublishedAt)}
                    </p>
                  )}
                  <ul className="text-sm text-gray-300 mt-2 space-y-1">
                    {generateResult.byCategory.map((r) => (
                      <li key={r.categoryId} className="flex items-center gap-2">
                        {r.created > 0 ? (
                          <CheckIcon className="h-4 w-4 text-green-400" />
                        ) : (
                          <XMarkIcon className="h-4 w-4 text-red-400" />
                        )}
                        <span className="text-gray-400">{r.categoryName}:</span>
                        <span>
                          {r.created}/{r.requested} borradores
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => { setShowGenerateModal(false); setGenerateResult(null) }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Ir a revisar borradores
                  </Button>
                </div>
              </div>
            ) : generateError ? (
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                  <div className="flex items-start gap-2">
                    <XMarkIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-medium">No se pudo generar</p>
                      <p className="text-sm text-red-300 mt-1">{generateError}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        No se creó ningún borrador. Verifica la conexión con GNews e inténtalo de nuevo.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => setGenerateError(null)}
                    variant="outline"
                    className="border-gray-600 hover:bg-gray-700"
                  >
                    Volver
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {categoriesWithCount.length === 0 ? (
                  <p className="text-yellow-400 text-sm p-3 bg-yellow-500/10 rounded border border-yellow-500/20">
                    No hay categorías creadas. Crea al menos una antes de generar con IA.
                  </p>
                ) : (
                  <>
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-300">
                          Categorías a procesar
                        </label>
                        <div className="flex gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setSelectedCategoryIds(categoriesWithCount.map((c) => c.id))}
                            className="text-cyan-400 hover:underline"
                          >
                            Todas
                          </button>
                          <span className="text-gray-600">·</span>
                          <button
                            type="button"
                            onClick={() => setSelectedCategoryIds([])}
                            className="text-cyan-400 hover:underline"
                          >
                            Ninguna
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1 max-h-48 overflow-y-auto bg-gray-700/30 rounded p-2">
                        {categoriesWithCount.map((cat) => (
                          <label key={cat.id} className="flex flex-col gap-0.5 p-1.5 hover:bg-gray-700/50 rounded cursor-pointer">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={selectedCategoryIds.includes(cat.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedCategoryIds((p) => [...p, cat.id])
                                    } else {
                                      setSelectedCategoryIds((p) => p.filter((x) => x !== cat.id))
                                    }
                                  }}
                                  className="rounded border-gray-500 text-purple-500 bg-gray-700 focus:ring-purple-500 flex-shrink-0"
                                />
                                <span className="text-sm text-gray-200 truncate">{cat.name}</span>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                {cat.newsCount === 0 && (
                                  <span className="text-[10px] text-yellow-400/80 uppercase tracking-wide">
                                    sin referencia
                                  </span>
                                )}
                                {!cat.description && (
                                  <span className="text-[10px] text-orange-400/80 uppercase tracking-wide">
                                    sin descripción
                                  </span>
                                )}
                              </div>
                            </div>
                            {cat.description && (
                              <p className="text-xs text-gray-400 italic ml-6 line-clamp-2">
                                {cat.description}
                              </p>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-300 block mb-2">
                        Noticias por categoría: <span className="text-purple-400 font-bold">{countPerCategory}</span>
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        value={countPerCategory}
                        onChange={(e) => setCountPerCategory(Number(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Total estimado: {selectedCategoryIds.length * countPerCategory} borradores · se basarán en titulares actuales de GNews en español
                      </p>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setShowGenerateModal(false); setGenerateError(null); setGenerateResult(null) }}
                        className="border-gray-600 hover:bg-gray-700"
                        disabled={generating}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleGenerate}
                        disabled={generating || selectedCategoryIds.length === 0}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {generating ? (
                          <>
                            <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                            Generando...
                          </>
                        ) : (
                          <>
                            <SparklesIcon className="h-4 w-4 mr-2" />
                            Generar
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'published' | 'drafts')}>
        <TabsList className="bg-gray-800 border border-gray-700">
          <TabsTrigger value="published" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400">
            Publicadas
            <span className="ml-2 text-xs bg-gray-700 px-1.5 py-0.5 rounded">
              {publishedPagination.total}
            </span>
          </TabsTrigger>
          <TabsTrigger value="drafts" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400">
            Borradores
            {draftsPagination.total > 0 && (
              <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                {draftsPagination.total}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="published" className="mt-4 space-y-3">
          {published.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No hay noticias publicadas</p>
          ) : (
            published.map((item) => (
              <div key={item.id} className="flex gap-4 p-4 rounded-lg bg-gray-800 border border-gray-700">
                {item.imageUrl && (
                  <div className="flex-shrink-0">
                    <Image
                      src={normalizeImageUrl(item.imageUrl)}
                      alt={item.name}
                      width={120}
                      height={80}
                      className="w-24 h-16 object-cover rounded"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-medium">{item.name}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className="bg-purple-600/20 text-purple-400 border-purple-500/30 text-xs">
                          {item.category.name}
                        </Badge>
                        {item.source === 'ai' && (
                          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
                            IA
                          </Badge>
                        )}
                        {item.imageSource && (
                          <Badge className="bg-gray-700/50 text-gray-400 border-gray-600 text-xs">
                            Fuente: {item.imageSource}
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">{formatDate(item.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-2 line-clamp-2">{item.shortText}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                        title="Editar"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="drafts" className="mt-4 space-y-4">
          {drafts.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <SparklesIcon className="h-10 w-10 mx-auto text-gray-600 mb-2" />
              <p>No hay borradores pendientes.</p>
              <p className="text-sm text-gray-500 mt-1">
                Usa &quot;Generar con IA&quot; para crear borradores con DeepSeek.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={
                      selectedDraftIds.length > 0 &&
                      selectedDraftIds.length === drafts.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) setSelectedDraftIds(drafts.map((d) => d.id))
                      else setSelectedDraftIds([])
                    }}
                    className="rounded border-gray-500 text-cyan-500 bg-gray-700 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-gray-300">
                    {selectedDraftIds.length > 0
                      ? `${selectedDraftIds.length} seleccionado(s)`
                      : 'Seleccionar todos'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => handleApproveBatch(selectedDraftIds)}
                    disabled={selectedDraftIds.length === 0 || bulkApproving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckIcon className="h-4 w-4 mr-2" />
                    Aprobar seleccionados
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleApproveBatch(drafts.map((d) => d.id))}
                    disabled={drafts.length === 0 || bulkApproving}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckIcon className="h-4 w-4 mr-2" />
                    Aprobar todos los borradores
                  </Button>
                </div>
              </div>

              {Array.from(draftsByRun.entries()).map(([runId, items]) => (
                <div key={runId} className="space-y-2">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-sm font-semibold text-gray-300">
                      {runId === '__manual__'
                        ? 'Borradores manuales'
                        : `Lote IA · ${items.length} borrador(es)`}
                    </h4>
                    {items.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleApproveBatch(items.map((d) => d.id))}
                          disabled={bulkApproving}
                          className="border-green-600 text-green-400 hover:bg-green-600/10 text-xs px-2 py-1"
                        >
                          <CheckIcon className="h-3 w-3 mr-1" />
                          Aprobar todos los del lote
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleDiscardRun(runId)}
                          className="border-red-600 text-red-400 hover:bg-red-600/10 text-xs px-2 py-1"
                        >
                          <TrashIcon className="h-3 w-3 mr-1" />
                          Descartar lote
                        </Button>
                      </div>
                    )}
                  </div>

                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 p-4 rounded-lg bg-gray-800 border border-yellow-500/20"
                    >
                      <div className="flex items-start pt-1">
                        <input
                          type="checkbox"
                          checked={selectedDraftIds.includes(item.id)}
                          onChange={() => toggleDraftSelection(item.id)}
                          className="rounded border-gray-500 text-cyan-500 bg-gray-700 focus:ring-cyan-500"
                        />
                      </div>
                      {item.imageUrl ? (
                        <div className="flex-shrink-0">
                          <Image
                            src={normalizeImageUrl(item.imageUrl)}
                            alt={item.name}
                            width={120}
                            height={80}
                            className="w-24 h-16 object-cover rounded"
                          />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-24 h-16 rounded bg-gray-700/50 border border-dashed border-gray-600 flex items-center justify-center text-xs text-gray-500">
                          sin imagen
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-white font-medium truncate">{item.name}</h4>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge className="bg-purple-600/20 text-purple-400 border-purple-500/30 text-xs">
                                {item.category.name}
                              </Badge>
                              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                                borrador
                              </Badge>
                              {item.source === 'ai' && (
                                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
                                  IA
                                </Badge>
                              )}
                              {item.imageSource && (
                                <Badge className="bg-gray-700/50 text-gray-400 border-gray-600 text-xs">
                                  Fuente: {item.imageSource}
                                </Badge>
                              )}
                              <span className="text-xs text-gray-500">{formatDate(item.createdAt)}</span>
                            </div>
                            <p className="text-sm text-gray-400 mt-2 line-clamp-2">{item.shortText}</p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleApprove(item.id)}
                              className="p-2 text-gray-400 hover:text-green-400 transition-colors"
                              title="Aprobar y publicar"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                              title="Editar (puedes añadir imagen)"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                              title="Eliminar borrador"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
