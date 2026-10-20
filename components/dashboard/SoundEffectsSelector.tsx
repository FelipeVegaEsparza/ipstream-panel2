'use client'

import { useEffect, useState } from 'react'
import { CheckCircleIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline'
import { EffectPreviewButton } from '@/components/sound-effects/EffectPreviewButton'

interface LibraryEffect {
  id: string
  name: string
  fileName: string
  mimeType: string
  url: string
  size: number
  createdAt: string
}

export function SoundEffectsSelector() {
  const [effects, setEffects] = useState<LibraryEffect[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/dashboard/sound-effects', { cache: 'no-store' })
        if (!res.ok) throw new Error('No se pudo cargar la biblioteca de efectos')
        const data = await res.json()
        setEffects(Array.isArray(data.effects) ? data.effects : [])
        setSelected(Array.isArray(data.selectedIds) ? data.selectedIds : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la biblioteca')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const selectedSet = new Set(selected)

  const toggle = (id: string) => {
    setNotice(null)
    setSelected((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch('/api/dashboard/sound-effects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ effectIds: selected }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar la selección')
      if (Array.isArray(data.selectedIds)) setSelected(data.selectedIds)
      setNotice('Selección guardada. Se usará en tu consola de transmisión en vivo.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la selección')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Efectos de sonido</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Elegí los efectos de la biblioteca que querés tener en la botonera de
          “Transmitir en vivo”. Podés escucharlos antes de seleccionarlos.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          <CheckCircleIcon className="h-4 w-4 shrink-0" />
          {notice}
        </p>
      )}

      <section className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <SpeakerWaveIcon className="h-4 w-4 text-brand" />
            Biblioteca
          </h2>
          <span className="rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground">
            {selected.length} seleccionado{selected.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Cargando efectos…</p>
        ) : effects.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Todavía no hay efectos disponibles en la biblioteca.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {effects.map((effect) => {
              const checked = selectedSet.has(effect.id)
              return (
                <li key={effect.id} className="flex flex-wrap items-center gap-3 py-3">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(effect.id)}
                      className="h-4 w-4 accent-[var(--brand-500)]"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">{effect.name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {checked ? 'Seleccionado' : 'Disponible'}
                      </span>
                    </span>
                  </label>
                  <EffectPreviewButton src={effect.url} name={effect.name} />
                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-[11px] text-muted-foreground">
            Los efectos elegidos reemplazan a los locales en la botonera; si no elegís ninguno, se mantienen los locales.
          </p>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || loading}
            className="rounded-lg bg-brand px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar selección'}
          </button>
        </div>
      </section>
    </div>
  )
}
