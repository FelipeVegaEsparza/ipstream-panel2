'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUpTrayIcon, TrashIcon } from '@heroicons/react/24/outline'
import { EffectPreviewButton } from '@/components/sound-effects/EffectPreviewButton'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Category { id: string; name: string; active: boolean; sortOrder: number; defaultForAi: boolean; _count?: { capsules: number } }
interface Capsule {
  id: string; title: string; description: string | null; fileName: string; mimeType: string;
  url: string; size: number; duration: number | null; active: boolean; createdAt: string;
  category: { id: string; name: string } | null; _count?: { clients: number };
}

function fmtSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function InfoCapsulesManager() {
  const { t } = useDashboardI18n()
  const [categories, setCategories] = useState<Category[]>([])
  const [capsules, setCapsules] = useState<Capsule[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)

  const load = async () => {
    try {
      setError(null)
      const [cRes, capRes] = await Promise.all([
        fetch('/api/admin/info-capsule-categories', { cache: 'no-store' }),
        fetch('/api/admin/info-capsules', { cache: 'no-store' }),
      ])
      if (!cRes.ok || !capRes.ok) throw new Error(t('admin.capsules.loadError'))
      const cData = await cRes.json()
      const capData = await capRes.json()
      setCategories(cData.categories || [])
      setCapsules(capData.capsules || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.capsules.loadError'))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])

  const createCategory = async () => {
    if (!newCategory.trim()) return
    const res = await fetch('/api/admin/info-capsule-categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategory.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return setError(data.error || t('admin.capsules.createCategoryError'))
    setNewCategory('')
    await load()
  }

  const updateCategory = async (category: Category, active: boolean) => {
    await fetch(`/api/admin/info-capsule-categories/${category.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    })
    await load()
  }

  const deleteCategory = async (category: Category) => {
    if (!confirm(t('admin.capsules.deleteCategoryConfirm', { name: category.name }))) return
    await fetch(`/api/admin/info-capsule-categories/${category.id}`, { method: 'DELETE' })
    await load()
  }

  const upload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return setError(t('admin.capsules.chooseFile'))
    setUploading(true); setError(null); setNotice(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('title', title.trim() || file.name.replace(/\.[^.]+$/, ''))
      form.append('description', description.trim())
      form.append('categoryId', categoryId)
      const res = await fetch('/api/admin/info-capsules', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t('admin.capsules.uploadError'))
      setTitle(''); setDescription(''); if (fileRef.current) fileRef.current.value = ''
      setNotice(t('admin.capsules.uploaded'))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.capsules.uploadError'))
    } finally { setUploading(false) }
  }

  const toggleCapsule = async (capsule: Capsule) => {
    const res = await fetch(`/api/admin/info-capsules/${capsule.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !capsule.active }),
    })
    if (!res.ok) setError(t('admin.capsules.toggleError'))
    await load()
  }

  const removeCapsule = async (capsule: Capsule) => {
    if (!confirm(t('admin.capsules.deleteConfirm', { title: capsule.title }))) return
    const res = await fetch(`/api/admin/info-capsules/${capsule.id}`, { method: 'DELETE' })
    if (!res.ok) setError(t('admin.capsules.deleteError'))
    await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('admin.capsules.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('admin.capsules.subtitle')}
        </p>
      </div>

      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
      {notice && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{notice}</p>}

      <section className="card space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t('admin.capsules.categories')}</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t('admin.capsules.categoriesHint')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
              <span className={`text-xs ${category.active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{category.name}</span>
              <button type="button" onClick={() => void updateCategory(category, !category.active)} className="text-[10px] text-muted-foreground hover:text-brand">
                {category.active ? t('admin.capsules.deactivate') : t('admin.capsules.activate')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await fetch(`/api/admin/info-capsule-categories/${category.id}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ defaultForAi: !category.defaultForAi }),
                  })
                  await load()
                }}
                className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${category.defaultForAi ? 'bg-brand/15 text-brand' : 'text-muted-foreground hover:text-brand'}`}
                title={t('admin.capsules.defaultAi')}
              >
                {category.defaultForAi ? 'IA' : t('admin.capsules.setDefaultAi')}
              </button>
              <button type="button" onClick={() => void deleteCategory(category)} className="text-muted-foreground hover:text-red-300" aria-label={t('admin.capsules.deleteCategory', { name: category.name })}>
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex max-w-md gap-2">
          <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder={t('admin.capsules.newCategory')} className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-brand" />
          <button type="button" onClick={() => void createCategory()} className="rounded-lg bg-secondary px-3 py-2 text-xs text-foreground hover:text-brand">{t('admin.capsules.create')}</button>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-foreground">{t('admin.capsules.uploadTitle')}</h2>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,220px)]">
          <input ref={fileRef} type="file" accept="audio/*,.mp3,.wav,.ogg,.oga,.opus,.m4a,.aac,.flac,.webm" className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:py-1.5 file:text-xs file:text-foreground" />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground">
            <option value="">{t('admin.capsules.uncategorized')}</option>
            {categories.filter((c) => c.active).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('admin.capsules.titlePlaceholder')} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-brand" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('admin.capsules.descriptionPlaceholder')} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-brand" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">{t('admin.capsules.uploadHint')}</p>
          <button type="button" onClick={() => void upload()} disabled={uploading} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-medium text-white disabled:opacity-50">
            <ArrowUpTrayIcon className="h-4 w-4" />{uploading ? t('admin.capsules.uploading') : t('admin.capsules.upload')}
          </button>
        </div>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">{t('admin.capsules.library')}</h2>
          <span className="rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground">{t('admin.capsules.count', { count: capsules.length })}</span>
        </div>
        {loading ? <p className="py-8 text-center text-sm text-muted-foreground">{t('admin.capsules.loading')}</p> : capsules.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{t('admin.capsules.empty')}</p> : (
          <ul className="divide-y divide-border">
            {capsules.map((capsule) => (
              <li key={capsule.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${capsule.active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{capsule.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {capsule.category?.name || t('admin.capsules.uncategorized')} · {capsule.fileName} · {fmtSize(capsule.size)}
                    {capsule._count?.clients ? ` · ${capsule._count.clients === 1 ? t('admin.capsules.client', { count: capsule._count.clients }) : t('admin.capsules.clients', { count: capsule._count.clients })}` : ''}
                  </p>
                </div>
                <EffectPreviewButton src={capsule.url} name={capsule.title} />
                <button type="button" onClick={() => void toggleCapsule(capsule)} className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-brand">
                  {capsule.active ? t('admin.capsules.active') : t('admin.capsules.inactive')}
                </button>
                <button type="button" onClick={() => void removeCapsule(capsule)} className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground hover:border-red-500/40 hover:text-red-300">
                  {t('admin.capsules.delete')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
