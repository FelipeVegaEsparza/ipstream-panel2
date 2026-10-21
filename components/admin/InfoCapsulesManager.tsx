'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUpTrayIcon, TrashIcon } from '@heroicons/react/24/outline'
import { EffectPreviewButton } from '@/components/sound-effects/EffectPreviewButton'

interface Category { id: string; name: string; active: boolean; sortOrder: number; _count?: { capsules: number } }
interface Capsule {
  id: string; title: string; description: string | null; fileName: string; mimeType: string;
  url: string; size: number; duration: number | null; active: boolean; createdAt: string;
  category: { id: string; name: string } | null; _count?: { clients: number };
}

function fmtSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function InfoCapsulesManager() {
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
      if (!cRes.ok || !capRes.ok) throw new Error('No se pudo cargar la biblioteca')
      const cData = await cRes.json()
      const capData = await capRes.json()
      setCategories(cData.categories || [])
      setCapsules(capData.capsules || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la biblioteca')
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
    if (!res.ok) return setError(data.error || 'No se pudo crear la categoría')
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
    if (!confirm(`¿Eliminar la categoría "${category.name}"? Las cápsulas quedarán sin categoría.`)) return
    await fetch(`/api/admin/info-capsule-categories/${category.id}`, { method: 'DELETE' })
    await load()
  }

  const upload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return setError('Elegí un archivo de audio.')
    setUploading(true); setError(null); setNotice(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('title', title.trim() || file.name.replace(/\.[^.]+$/, ''))
      form.append('description', description.trim())
      form.append('categoryId', categoryId)
      const res = await fetch('/api/admin/info-capsules', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'No se pudo subir la cápsula')
      setTitle(''); setDescription(''); if (fileRef.current) fileRef.current.value = ''
      setNotice('Cápsula agregada. Para AutoDJ debe ser MP3.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la cápsula')
    } finally { setUploading(false) }
  }

  const toggleCapsule = async (capsule: Capsule) => {
    const res = await fetch(`/api/admin/info-capsules/${capsule.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !capsule.active }),
    })
    if (!res.ok) setError('No se pudo cambiar el estado')
    await load()
  }

  const removeCapsule = async (capsule: Capsule) => {
    if (!confirm(`¿Eliminar "${capsule.title}"? También se quitará de las radios y playlists.`)) return
    const res = await fetch(`/api/admin/info-capsules/${capsule.id}`, { method: 'DELETE' })
    if (!res.ok) setError('No se pudo eliminar la cápsula')
    await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cápsulas informativas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Biblioteca global de audios informativos. Los clientes eligen cuáles usar en vivo y pueden agregarlos a su playlist de AutoDJ.
        </p>
      </div>

      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
      {notice && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{notice}</p>}

      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Categorías</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
              <span className={`text-xs ${category.active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{category.name}</span>
              <button type="button" onClick={() => void updateCategory(category, !category.active)} className="text-[10px] text-muted-foreground hover:text-brand">
                {category.active ? 'Desactivar' : 'Activar'}
              </button>
              <button type="button" onClick={() => void deleteCategory(category)} className="text-muted-foreground hover:text-red-300" aria-label={`Eliminar ${category.name}`}>
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex max-w-md gap-2">
          <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Nueva categoría" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-brand" />
          <button type="button" onClick={() => void createCategory()} className="rounded-lg bg-secondary px-3 py-2 text-xs text-foreground hover:text-brand">Crear</button>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Subir cápsula</h2>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,220px)]">
          <input ref={fileRef} type="file" accept="audio/*,.mp3,.wav,.ogg,.oga,.opus,.m4a,.aac,.flac,.webm" className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:py-1.5 file:text-xs file:text-foreground" />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground">
            <option value="">Sin categoría</option>
            {categories.filter((c) => c.active).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la cápsula" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-brand" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción (opcional)" rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-brand" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">Máximo 50 MB. Para agregar al AutoDJ la cápsula debe ser MP3.</p>
          <button type="button" onClick={() => void upload()} disabled={uploading} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-medium text-white disabled:opacity-50">
            <ArrowUpTrayIcon className="h-4 w-4" />{uploading ? 'Subiendo…' : 'Subir cápsula'}
          </button>
        </div>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Biblioteca</h2>
          <span className="rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground">{capsules.length} cápsulas</span>
        </div>
        {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p> : capsules.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay cápsulas.</p> : (
          <ul className="divide-y divide-border">
            {capsules.map((capsule) => (
              <li key={capsule.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${capsule.active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{capsule.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {capsule.category?.name || 'Sin categoría'} · {capsule.fileName} · {fmtSize(capsule.size)}
                    {capsule._count?.clients ? ` · ${capsule._count.clients} cliente${capsule._count.clients === 1 ? '' : 's'}` : ''}
                  </p>
                </div>
                <EffectPreviewButton src={capsule.url} name={capsule.title} />
                <button type="button" onClick={() => void toggleCapsule(capsule)} className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-brand">
                  {capsule.active ? 'Activa' : 'Inactiva'}
                </button>
                <button type="button" onClick={() => void removeCapsule(capsule)} className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground hover:border-red-500/40 hover:text-red-300">
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
