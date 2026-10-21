'use client'

import { useEffect, useState } from 'react'
import { SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface AiInfo {
  ttsEnabled: boolean
  ttsRemaining: number
  provider: 'elevenlabs' | 'fish'
  voiceName: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const input = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none'

export function CapsuleAiModal({ open, onClose, onSaved }: Props) {
  const [info, setInfo] = useState<AiInfo | null>(null)
  const [title, setTitle] = useState('Cápsula informativa')
  const [text, setText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ title: string; url: string } | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setCreated(null)
    fetch('/api/dashboard/info-capsules/ai', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setInfo(data))
      .catch(() => setError('No se pudo cargar la configuración de IA'))
  }, [open])

  if (!open) return null

  const generate = async () => {
    if (!text.trim()) return setError('Escribí el texto de la cápsula.')
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/dashboard/info-capsules/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, text }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || data.error || 'No se pudo generar la cápsula')
      setCreated({ title: data.capsule?.title || title, url: data.capsule?.url || '' })
      setInfo((prev) => prev ? { ...prev, ttsRemaining: Number(data.remaining ?? prev.ttsRemaining) } : prev)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar la cápsula')
    } finally { setGenerating(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-soft" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <SparklesIcon className="h-5 w-5 text-brand" />
              Crear cápsula informativa con IA
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Escribí el guion y la IA lo convierte en una cápsula de audio para tu radio.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary" aria-label="Cerrar">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {info && (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-secondary/50 p-3 text-xs">
            <div>
              <p className="text-muted-foreground">Locución disponible</p>
              <p className="font-mono text-foreground">{info.ttsRemaining.toLocaleString('es-CL')} caracteres</p>
            </div>
            <div>
              <p className="text-muted-foreground">Voz</p>
              <p className="text-foreground">{info.voiceName}</p>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Título</label>
            <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={180} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Guion de la cápsula</label>
            <textarea
              className={`${input} resize-none`}
              rows={7}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 1000))}
              placeholder="Escribí la información que querés que lea la locutora o locutor…"
            />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">{text.length}/1000</p>
          </div>
        </div>

        {error && <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
        {created && (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            <p className="text-xs font-medium text-emerald-300">“{created.title}” creada y agregada a tus cápsulas.</p>
            {created.url && <audio src={created.url} controls className="mt-2 w-full" preload="metadata" />}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary">
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={generating || !info?.ttsEnabled || !text.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            <SparklesIcon className="h-4 w-4" />
            {generating ? 'Generando…' : 'Generar y guardar cápsula'}
          </button>
        </div>
      </div>
    </div>
  )
}
