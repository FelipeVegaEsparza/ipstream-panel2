'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircleIcon, PlusIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline'
import { EffectPreviewButton } from '@/components/sound-effects/EffectPreviewButton'
import { showToast } from '@/components/ui/toast'

interface Capsule {
  id: string; title: string; description: string | null; fileName: string;
  mimeType: string; url: string; size: number; duration: number | null;
  category: { id: string; name: string } | null;
}
interface Category { id: string; name: string }

export function InfoCapsulesSelector() {
  const [capsules, setCapsules] = useState<Capsule[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/dashboard/info-capsules', { cache: 'no-store' })
      if (!res.ok) throw new Error('No se pudo cargar la biblioteca de cápsulas')
      const data = await res.json()
      setCapsules(Array.isArray(data.capsules) ? data.capsules : [])
      setCategories(Array.isArray(data.categories) ? data.categories : [])
      setSelected(Array.isArray(data.selectedIds) ? data.selectedIds : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la biblioteca')
    } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => categoryFilter
    ? capsules.filter((capsule) => (categoryFilter === '__none__' ? !capsule.category : capsule.category?.id === categoryFilter))
    : capsules, [capsules, categoryFilter])

  const toggle = (id: string) => setSelected((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])

  const save = async () => {
    setSaving(true); setError(null); setNotice(null)
    try {
      const res = await fetch('/api/dashboard/info-capsules', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capsuleIds: selected }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar la selección')
      setSelected(Array.isArray(data.selectedIds) ? data.selectedIds : selected)
      setNotice('Selección guardada. Estas cápsulas aparecerán en tu consola en vivo.')
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar la selección') }
    finally { setSaving(false) }
  }

  const addToAutoDj = async (capsule: Capsule) => {
    setAddingId(capsule.id); setError(null); setNotice(null)
    try {
      const res = await fetch(`/api/dashboard/info-capsules/${capsule.id}/auto-dj`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || data.error || 'No se pudo agregar al AutoDJ')
      setNotice(`“${capsule.title}” agregada a la playlist de AutoDJ.`)
    } catch (err) {
      showToast({ type: 'error', title: err instanceof Error ? err.message : 'No se pudo agregar al AutoDJ' })
    } finally { setAddingId(null) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cápsulas informativas</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Elegí cápsulas de la biblioteca para usarlas en vivo. También podés agregarlas a tu playlist de AutoDJ como un track más.
        </p>
      </div>

      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
      {notice && <p className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"><CheckCircleIcon className="h-4 w-4" />{notice}</p>}

      <section className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground"><SpeakerWaveIcon className="h-4 w-4 text-brand" />Biblioteca</h2>
          <div className="flex items-center gap-2">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground">
              <option value="">Todas las categorías</option>
              <option value="__none__">Sin categoría</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <span className="rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground">{selected.length} para vivo</span>
          </div>
        </div>

        {loading ? <p className="py-10 text-center text-sm text-muted-foreground">Cargando cápsulas…</p> : filtered.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No hay cápsulas disponibles.</p> : (
          <ul className="divide-y divide-border">
            {filtered.map((capsule) => {
              const checked = selected.includes(capsule.id)
              return (
                <li key={capsule.id} className="flex flex-wrap items-center gap-3 py-3">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={checked} onChange={() => toggle(capsule.id)} className="mt-1 h-4 w-4 accent-[var(--brand-500)]" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">{capsule.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {capsule.category?.name || 'Sin categoría'}{capsule.description ? ` · ${capsule.description}` : ''}
                      </span>
                    </span>
                  </label>
                  <EffectPreviewButton src={capsule.url} name={capsule.title} />
                  <button type="button" onClick={() => void addToAutoDj(capsule)} disabled={addingId === capsule.id} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:border-brand hover:text-brand disabled:opacity-50">
                    <PlusIcon className="h-3.5 w-3.5" />{addingId === capsule.id ? 'Agregando…' : 'Agregar al AutoDJ'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-[11px] text-muted-foreground">Máximo 200 cápsulas seleccionadas para vivo. Para AutoDJ deben ser MP3 y necesitás una playlist activa.</p>
          <button type="button" onClick={() => void save()} disabled={saving || loading} className="rounded-lg bg-brand px-4 py-2 text-xs font-medium text-white disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar selección'}
          </button>
        </div>
      </section>
    </div>
  )
}
