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
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

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
  const { t } = useDashboardI18n()
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
    return tutorials.filter((tutorial) => tutorial.categoryId === filterCategory)
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

  const startEdit = (tutorial: AdminTutorial) => {
    setCreating(false)
    setEditing(tutorial)
    setForm({
      title: tutorial.title,
      description: tutorial.description ?? '',
      youtubeUrl: tutorial.youtubeUrl,
      categoryId: tutorial.categoryId,
      order: tutorial.order,
      isPublished: tutorial.isPublished,
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
      setFeedback({ type: 'error', message: t('admin.tutorials.manager.invalidUrl') })
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
        throw new Error(data.error || t('admin.tutorials.manager.saveError'))
      }
      const data = await res.json()
      if (editing) {
        setTutorials((prev) => prev.map((tutorial) => (tutorial.id === editing.id ? data.tutorial : tutorial)))
      } else {
        setTutorials((prev) => [data.tutorial, ...prev])
      }
      setFeedback({ type: 'success', message: t('admin.tutorials.manager.saved') })
      cancel()
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : t('admin.tutorials.manager.saveError'),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (tutorial: AdminTutorial) => {
    if (!confirm(t('admin.tutorials.manager.confirmDelete', { title: tutorial.title }))) return
    setFeedback(null)
    try {
      const res = await fetch(`/api/admin/tutorials/${tutorial.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || t('admin.tutorials.manager.deleteError'))
      }
      setTutorials((prev) => prev.filter((x) => x.id !== tutorial.id))
      setFeedback({ type: 'success', message: t('admin.tutorials.manager.deleted') })
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : t('admin.tutorials.manager.deleteError'),
      })
    }
  }

  if (initialCategories.length === 0) {
    return (
      <div className="text-center py-12 bg-card/40 rounded-xl border border-dashed border-border">
        <p className="text-foreground font-medium mb-2">{t('admin.tutorials.manager.noCategories')}</p>
        <p className="text-sm text-muted-foreground mb-4">
          {t('admin.tutorials.manager.noCategoriesHint')}
        </p>
        <a
          href="/admin/tutorial-categories"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand"
        >
          {t('admin.tutorials.manager.goCategories')}
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t('admin.tutorials.manager.title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.tutorials.manager.subtitle')}
          </p>
        </div>
        {!creating && !editing && (
          <Button onClick={startCreate} className="bg-brand hover:bg-brand">
            <Plus className="h-4 w-4 mr-2" />
            {t('admin.tutorials.manager.new')}
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
              {editing ? t('admin.tutorials.manager.edit') : t('admin.tutorials.manager.new')}
            </h3>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">{t('admin.tutorials.manager.titleLabel')}</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground"
                placeholder={t('admin.tutorials.manager.titlePlaceholder')}
                maxLength={200}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">{t('admin.tutorials.manager.youtubeUrl')}</label>
              <input
                type="url"
                value={form.youtubeUrl}
                onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                className={`w-full bg-secondary border rounded-lg px-3 py-2 text-foreground ${
                  form.youtubeUrl && !isValidUrl
                    ? 'border-red-500'
                    : isValidUrl
                    ? 'border-green-500'
                    : 'border-border'
                }`}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              {form.youtubeUrl && !isValidUrl && (
                <p className="text-red-400 text-xs mt-1">
                  {t('admin.tutorials.manager.invalidUrlHint')}
                </p>
              )}
              {isValidUrl && (
                <p className="text-green-400 text-xs mt-1">
                  {t('admin.tutorials.manager.detected', { id: videoId ?? '' })}
                </p>
              )}
            </div>

            {isValidUrl && (
              <div>
                <label className="text-sm text-muted-foreground block mb-2">{t('admin.tutorials.manager.preview')}</label>
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
                <div className="relative aspect-video bg-background rounded-lg overflow-hidden">
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
                    className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors text-foreground"
                  >
                    <PlayCircle className="h-12 w-12" />
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm text-muted-foreground block mb-1">{t('admin.tutorials.manager.description')}</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground"
                rows={3}
                placeholder={t('admin.tutorials.manager.descriptionPlaceholder')}
                maxLength={2000}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">{t('admin.tutorials.manager.category')}</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground"
                >
                  {initialCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">{t('admin.tutorials.manager.order')}</label>
                <input
                  type="number"
                  min="0"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                  className="w-32 bg-secondary border border-border rounded-lg px-3 py-2 text-foreground"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                className="rounded border-border bg-secondary"
              />
              {t('admin.tutorials.manager.publishedHint')}
            </label>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={saving || !isValidUrl || !form.title.trim() || !form.categoryId}
                className="bg-brand hover:bg-brand"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? t('common.saving') : t('common.save')}
              </Button>
              <Button onClick={cancel} variant="outline" className="border-border">
                <X className="h-4 w-4 mr-2" />
                {t('common.cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('admin.tutorials.manager.filter')}</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-secondary border border-border rounded px-2 py-1 text-sm text-foreground"
            >
              <option value="all">{t('admin.tutorials.manager.allCategories', { count: tutorials.length })}</option>
              {initialCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({tutorials.filter((tutorial) => tutorial.categoryId === c.id).length})
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              {tutorials.length === 0
                ? t('admin.tutorials.manager.noTutorials')
                : t('admin.tutorials.manager.noInCategory')}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((tutorial) => {
                const tVideoId = extractYouTubeId(tutorial.youtubeUrl)
                const thumb = tVideoId
                  ? thumbErrors[tutorial.id]
                    ? getYouTubeThumbnailFallbackUrl(tVideoId)
                    : getYouTubeThumbnailUrl(tVideoId)
                  : null
                return (
                  <li
                    key={tutorial.id}
                    className="flex items-start gap-3 p-4 hover:bg-secondary/30"
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={tutorial.title}
                        className="w-32 h-20 object-cover rounded flex-shrink-0"
                        onError={() =>
                          setThumbErrors((prev) => ({ ...prev, [tutorial.id]: true }))
                        }
                      />
                    ) : (
                      <div className="w-32 h-20 bg-secondary rounded flex items-center justify-center flex-shrink-0">
                        <PlayCircle className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-foreground font-semibold">{tutorial.title}</h3>
                        {tutorial.isPublished ? (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-600/20 text-green-300 border border-green-600/30 inline-flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            Publicado
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded bg-secondary/20 text-muted-foreground border border-border/30 inline-flex items-center gap-1">
                            <EyeOff className="h-3 w-3" />
                            Borrador
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-brand mt-0.5">{tutorial.category.name}</p>
                      {tutorial.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {tutorial.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(tutorial)}
                        className="border-border"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(tutorial)}
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
