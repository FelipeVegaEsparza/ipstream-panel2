'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUpTrayIcon, TrashIcon } from '@heroicons/react/24/outline'
import { EffectPreviewButton } from '@/components/sound-effects/EffectPreviewButton'

interface AdminEffect {
  id: string
  name: string
  fileName: string
  mimeType: string
  url: string
  size: number
  active: boolean
  createdAt: string
  _count?: { clients: number }
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function SoundEffectsManager() {
  const [effects, setEffects] = useState<AdminEffect[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [name, setName] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)

  const load = async () => {
    setError(null)
    try {
      const res = await fetch('/api/admin/sound-effects', { cache: 'no-store' })
      if (!res.ok) throw new Error('No se pudo cargar la biblioteca')
      const data = await res.json()
      setEffects(Array.isArray(data.effects) ? data.effects : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la biblioteca')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const upload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setError('Elegí un archivo de audio.')
      return
    }
    setUploading(true)
    setError(null)
    setNotice(null)
    try {
      const form = new FormData()
      form.append('file', file)
      if (name.trim()) form.append('name', name.trim())
      const res = await fetch('/api/admin/sound-effects', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || data.error || 'No se pudo subir el efecto')
      setName('')
      if (fileRef.current) fileRef.current.value = ''
      setNotice('Efecto agregado a la biblioteca.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el efecto')
    } finally {
      setUploading(false)
    }
  }

  const remove = async (effect: AdminEffect) => {
    if (!window.confirm(`¿Eliminar "${effect.name}" de la biblioteca? También se quitará de los clientes que lo usan.`)) return
    setDeletingId(effect.id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/sound-effects/${effect.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('No se pudo eliminar el efecto')
      setEffects((prev) => prev.filter((item) => item.id !== effect.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el efecto')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Efectos de sonido</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subí audios a la biblioteca global. Después cada cliente elige los que quiere
          usar en su consola de transmisión en vivo.
        </p>
      </div>

      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Agregar efecto</h2>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,240px)_auto] md:items-end">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Archivo de audio</span>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.oga,.opus,.m4a,.aac,.flac,.webm"
              className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:py-1.5 file:text-xs file:text-foreground"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Nombre visible (opcional)</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              placeholder="Ej: Aplausos"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-brand"
            />
          </label>
          <button
            type="button"
            onClick={() => void upload()}
            disabled={uploading}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            {uploading ? 'Subiendo…' : 'Subir efecto'}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">MP3, WAV, OGG, OPUS, M4A, AAC, FLAC o WEBM. Máximo 20 MB.</p>
        {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
        {notice && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{notice}</p>}
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Biblioteca</h2>
          <span className="rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground">
            {effects.length} {effects.length === 1 ? 'efecto' : 'efectos'}
          </span>
        </div>
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p>
        ) : effects.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay efectos cargados.</p>
        ) : (
          <ul className="divide-y divide-border">
            {effects.map((effect) => (
              <li key={effect.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{effect.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {effect.fileName} · {formatSize(effect.size)}
                    {effect._count?.clients ? ` · ${effect._count.clients} cliente${effect._count.clients === 1 ? '' : 's'}` : ''}
                  </p>
                </div>
                <EffectPreviewButton src={effect.url} name={effect.name} />
                <button
                  type="button"
                  onClick={() => void remove(effect)}
                  disabled={deletingId === effect.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  {deletingId === effect.id ? 'Eliminando…' : 'Eliminar'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
