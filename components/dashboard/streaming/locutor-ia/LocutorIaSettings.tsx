'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { showToast } from '@/components/ui/toast'
import { SparklesIcon, PlusIcon, Trash2Icon, PlayIcon, SaveIcon } from 'lucide-react'
import { DEFAULT_PRESENTER_PHRASES } from '@/lib/live-console/presenter'

interface Config {
  enabled: boolean
  every: number
  phrases: string[]
  aiEnabled: boolean
  remaining: number
  limit: number
  stationName: string
}

const input =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none'

export function LocutorIaSettings() {
  const [config, setConfig] = useState<Config | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [every, setEvery] = useState(3)
  const [phrases, setPhrases] = useState<string[]>([...DEFAULT_PRESENTER_PHRASES])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applyMessage, setApplyMessage] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/dashboard/streaming/ai/config', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'No se pudo cargar la configuración')
      setConfig(data)
      setEnabled(Boolean(data.enabled))
      setEvery(Number(data.every) || 3)
      setPhrases(Array.isArray(data.phrases) && data.phrases.length ? data.phrases : [...DEFAULT_PRESENTER_PHRASES])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la configuración')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const save = async (): Promise<boolean> => {
    setSaving(true)
    setError(null)
    try {
      const clean = phrases.map((phrase) => phrase.trim()).filter(Boolean)
      const res = await fetch('/api/dashboard/streaming/ai/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          every,
          phrases: clean.length ? clean : DEFAULT_PRESENTER_PHRASES,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || data?.error || 'No se pudo guardar')
      setConfig(data)
      setPhrases(Array.isArray(data.phrases) && data.phrases.length ? data.phrases : clean)
      showToast({ type: 'success', title: 'Locutor IA guardado' })
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
      return false
    } finally {
      setSaving(false)
    }
  }

  const applyAutoDj = async () => {
    if (!enabled) {
      setError('Activá el locutor IA antes de aplicarlo al AutoDJ.')
      return
    }
    setApplying(true)
    setError(null)
    setApplyMessage(null)
    try {
      const saved = await save()
      if (!saved) return
      const res = await fetch('/api/dashboard/streaming/ai/autodj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || data?.error || 'No se pudo preparar el AutoDJ')
      setApplyMessage(data.message || 'AutoDJ preparado')
      showToast({ type: 'success', title: data.message || 'AutoDJ preparado' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo preparar el AutoDJ')
    } finally {
      setApplying(false)
    }
  }

  const updatePhrase = (index: number, value: string) => {
    setPhrases((prev) => prev.map((phrase, i) => (i === index ? value.slice(0, 240) : phrase)))
  }

  const addPhrase = () => {
    if (phrases.length >= 20) return
    setPhrases((prev) => [...prev, 'Estás escuchando {{radio}}. A continuación, {{titulo}} de {{artista}}.'])
  }

  const removePhrase = (index: number) => {
    setPhrases((prev) => prev.filter((_, i) => i !== index))
  }

  if (loading) {
    return <div className="card text-sm text-muted-foreground">Cargando configuración…</div>
  }

  if (!config) {
    return <div className="card text-sm text-red-300">{error || 'No se pudo cargar la configuración.'}</div>
  }

  if (!config.aiEnabled) {
    return (
      <div className="card max-w-2xl space-y-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <SparklesIcon className="h-5 w-5 text-brand" />
          Locutor IA
        </h2>
        <p className="text-sm text-muted-foreground">
          Esta función requiere un plan con IA en vivo. Contactá al administrador para habilitarla.
        </p>
        <Link href="/dashboard/streaming/live" className="text-sm text-brand hover:underline">
          Ir a la consola en vivo
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
      <section className="card space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <SparklesIcon className="h-5 w-5 text-brand" />
              Presentador
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Se usa en la consola en vivo y en el AutoDJ. La radio es <strong>{config.stationName}</strong>.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="h-4 w-4 rounded border-border bg-secondary"
            />
            Activo
          </label>
        </div>

        <div className="max-w-xs">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Presentar cada
          </label>
          <select
            value={every}
            onChange={(event) => setEvery(Number(event.target.value))}
            className={input}
            disabled={!enabled}
          >
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
              <option key={value} value={value}>
                {value} temas
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            En vivo se aplica al refrescar la consola. En AutoDJ, al pulsar “Aplicar al AutoDJ”.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground">Frases del locutor</label>
              <p className="text-xs text-muted-foreground">
                Se elige una al azar para cada presentación. Variables: {'{{radio}}'}, {'{{titulo}}'}, {'{{artista}}'}.
              </p>
            </div>
            <button
              type="button"
              onClick={addPhrase}
              disabled={phrases.length >= 20}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:border-brand hover:text-brand disabled:opacity-40"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Agregar
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {phrases.map((phrase, index) => (
              <div key={index} className="flex items-start gap-2">
                <textarea
                  value={phrase}
                  onChange={(event) => updatePhrase(index, event.target.value)}
                  rows={2}
                  className={`${input} resize-none`}
                  placeholder="Estás escuchando {{radio}}. A continuación, {{titulo}} de {{artista}}."
                />
                <button
                  type="button"
                  onClick={() => removePhrase(index)}
                  disabled={phrases.length <= 1}
                  className="mt-1 rounded-lg border border-border p-2 text-muted-foreground hover:text-red-300 disabled:opacity-30"
                  title="Quitar frase"
                  aria-label="Quitar frase"
                >
                  <Trash2Icon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Si una frase no usa variables, se le agrega automáticamente el nombre de la radio,
            el título y el artista del próximo tema.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || applying}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            <SaveIcon className="h-4 w-4" />
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <span className="text-xs text-muted-foreground">
            Cuota IA: {config.remaining.toLocaleString('es-CL')} / {config.limit.toLocaleString('es-CL')} caracteres.
          </span>
        </div>

        {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
      </section>

      <aside className="space-y-4">
        <section className="card space-y-3">
          <h2 className="text-lg font-semibold text-foreground">AutoDJ</h2>
          <p className="text-sm text-muted-foreground">
            Genera las intros para los próximos temas y las instala en la fuente IA del AutoDJ.
            Los jingles normales no se modifican.
          </p>
          <button
            type="button"
            onClick={() => void applyAutoDj()}
            disabled={applying || saving || !enabled}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand/40 bg-brand/10 px-4 py-2 text-sm font-medium text-brand hover:bg-brand/20 disabled:opacity-50"
          >
            <PlayIcon className="h-4 w-4" />
            {applying ? 'Preparando AutoDJ…' : 'Aplicar al AutoDJ'}
          </button>
          {applyMessage && <p className="text-xs text-green-300">{applyMessage}</p>}
          <p className="text-[11px] text-muted-foreground">
            La playlist debe estar sin shuffle. Si cambiás la playlist, la frecuencia o las frases,
            volvé a aplicar.
          </p>
        </section>

        <section className="card space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Locuciones libres</h2>
          <p className="text-xs text-muted-foreground">
            En la consola en vivo usá el botón <strong>Libre</strong> para crear una locución y
            agregarla a la lista.
          </p>
          <Link href="/dashboard/streaming/live" className="text-xs text-brand hover:underline">
            Ir a la consola en vivo
          </Link>
        </section>
      </aside>
    </div>
  )
}
