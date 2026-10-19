'use client'

import { useEffect, useState } from 'react'
import { showToast } from '@/components/ui/toast'
import { SparklesIcon, PlayIcon, ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface AiInfo {
  musicEnabled: boolean
  musicLimitSeconds: number
  musicUsedSeconds: number
  musicRemainingSeconds: number
  ttsEnabled: boolean
  ttsRemaining: number
  voiceName: string
  stationName: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const input =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none'

export function JingleAiModal({ open, onClose, onSaved }: Props) {
  const [info, setInfo] = useState<AiInfo | null>(null)
  const [title, setTitle] = useState('Jingle de la emisora')
  const [prompt, setPrompt] = useState('Jingle instrumental de radio, synth pop moderno, energía alta, final limpio, sin voces.')
  const [tagline, setTagline] = useState('{{radio}}, la que te mueve.')
  const [duration, setDuration] = useState(10)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    fetch('/api/dashboard/streaming/jingles/ai', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setInfo(data))
      .catch(() => setError('No se pudo cargar la cuota de jingles IA'))
  }, [open])

  useEffect(() => {
    if (!blob) {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(blob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [blob])

  if (!open) return null

  const generate = async () => {
    setGenerating(true)
    setError(null)
    setBlob(null)
    try {
      const res = await fetch('/api/dashboard/streaming/jingles/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, prompt, tagline, duration }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message || data?.error || 'No se pudo generar el jingle')
      }
      setBlob(await res.blob())
      setInfo((prev) => prev ? {
        ...prev,
        musicRemainingSeconds: Number(res.headers.get('X-Music-Remaining') ?? prev.musicRemainingSeconds),
        ttsRemaining: Number(res.headers.get('X-AI-Remaining') ?? prev.ttsRemaining),
      } : prev)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el jingle')
    } finally {
      setGenerating(false)
    }
  }

  const save = async () => {
    if (!blob) return
    setSaving(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', new File([blob], `jingle-ia-${Date.now()}.mp3`, { type: 'audio/mpeg' }))
      form.append('title', title)
      const res = await fetch('/api/dashboard/streaming/jingles/ai/save', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || data?.error || 'No se pudo guardar el jingle')
      showToast({ type: 'success', title: 'Jingle IA guardado' })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el jingle')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-soft" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <SparklesIcon className="h-5 w-5 text-brand" />
              Crear jingle IA
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Música instrumental con Eleven Music y locución con la voz de la emisora.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary" aria-label="Cerrar">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {info && (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-secondary/50 p-3 text-xs">
            <div>
              <p className="text-muted-foreground">Música IA disponible</p>
              <p className="font-mono text-foreground">{Math.floor(info.musicRemainingSeconds / 60)} min {info.musicRemainingSeconds % 60}s</p>
            </div>
            <div>
              <p className="text-muted-foreground">Locución disponible</p>
              <p className="font-mono text-foreground">{info.ttsRemaining.toLocaleString('es-CL')} caracteres</p>
            </div>
            <div className="col-span-2 text-muted-foreground">
              Voz: <span className="text-foreground">{info.voiceName}</span> · Radio: <span className="text-foreground">{info.stationName}</span>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Nombre del jingle</label>
            <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={180} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Estilo de la música</label>
            <textarea className={`${input} resize-none`} rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={600} />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Describí género, energía e instrumentos. Se genera instrumental, sin voces.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Locución</label>
            <textarea className={`${input} resize-none`} rows={2} value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={300} />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Podés usar {'{{radio}}'}. La voz y expresividad salen de Locutor IA.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Duración</label>
            <select className={input} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              <option value={10}>10 segundos</option>
              <option value={15}>15 segundos</option>
            </select>
          </div>
        </div>

        {error && <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

        {previewUrl && (
          <audio src={previewUrl} controls className="mt-4 w-full" preload="metadata" />
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary">
            Cancelar
          </button>
          <button
            onClick={() => void generate()}
            disabled={generating || !info?.musicEnabled || !info?.ttsEnabled}
            className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground hover:text-brand disabled:opacity-40"
          >
            <PlayIcon className="h-4 w-4" />
            {generating ? 'Generando…' : 'Generar preview'}
          </button>
          <button
            onClick={() => void save()}
            disabled={!blob || saving}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {saving ? 'Guardando…' : 'Publicar en Jingles'}
          </button>
        </div>
      </div>
    </div>
  )
}
