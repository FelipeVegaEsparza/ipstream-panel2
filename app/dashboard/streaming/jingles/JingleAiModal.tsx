'use client'

import { useEffect, useState } from 'react'
import { showToast } from '@/components/ui/toast'
import { SparklesIcon, PlayIcon, ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

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
  const { t, locale } = useDashboardI18n()
  const [info, setInfo] = useState<AiInfo | null>(null)
  const [title, setTitle] = useState(() => t('streaming.jingles.ai.defaultTitle'))
  const [styles, setStyles] = useState<string[]>(['Pop'])
  const [energy, setEnergy] = useState<'suave' | 'media' | 'alta'>('alta')
  const [tagline, setTagline] = useState(() => t('streaming.jingles.ai.defaultTagline'))
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
      .catch(() => setError(t('streaming.jingles.ai.loadError')))
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

  const toggleStyle = (style: string) => {
    setStyles((prev) => prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style])
  }

  const generate = async () => {
    setGenerating(true)
    setError(null)
    setBlob(null)
    const musicPrompt = `Jingle instrumental de radio, estilo ${(styles.length ? styles : ['Pop']).join(', ')}, energía ${energy}, final limpio, sin voces.`
    try {
      const res = await fetch('/api/dashboard/streaming/jingles/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, prompt: musicPrompt, tagline, duration }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message || data?.error || t('streaming.jingles.ai.generateError'))
      }
      setBlob(await res.blob())
      setInfo((prev) => prev ? {
        ...prev,
        musicRemainingSeconds: Number(res.headers.get('X-Music-Remaining') ?? prev.musicRemainingSeconds),
        ttsRemaining: Number(res.headers.get('X-AI-Remaining') ?? prev.ttsRemaining),
      } : prev)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.jingles.ai.generateError'))
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
      if (!res.ok) throw new Error(data?.message || data?.error || t('streaming.jingles.ai.saveError'))
      showToast({ type: 'success', title: t('streaming.jingles.ai.saved') })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.jingles.ai.saveError'))
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
              {t('streaming.jingles.ai.title')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('streaming.jingles.ai.subtitle')}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary" aria-label={t('streaming.jingles.ai.close')}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {info && (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-secondary/50 p-3 text-xs">
            <div>
              <p className="text-muted-foreground">{t('streaming.jingles.ai.musicAvailable')}</p>
              <p className="font-mono text-foreground">{Math.floor(info.musicRemainingSeconds / 60)} min {info.musicRemainingSeconds % 60}s</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('streaming.jingles.ai.voiceAvailable')}</p>
              <p className="font-mono text-foreground">{t('streaming.jingles.ai.characters', { count: info.ttsRemaining.toLocaleString(locale === 'en' ? 'en-US' : 'es-CL') })}</p>
            </div>
            <div className="col-span-2 text-muted-foreground">
              {t('streaming.jingles.ai.voice')}: <span className="text-foreground">{info.voiceName}</span> · {t('streaming.jingles.ai.station')}: <span className="text-foreground">{info.stationName}</span>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{t('streaming.jingles.ai.name')}</label>
            <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={180} />
          </div>
          <div>
            <label className="mb-2 block text-xs text-muted-foreground">{t('streaming.jingles.ai.style')}</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {([
                ['Pop', t('streaming.jingles.ai.stylePop')],
                ['Rock', t('streaming.jingles.ai.styleRock')],
                ['Urbano', t('streaming.jingles.ai.styleUrban')],
                ['Electrónica', t('streaming.jingles.ai.styleElectronic')],
                ['Corporativo', t('streaming.jingles.ai.styleCorporate')],
                ['Acústico', t('streaming.jingles.ai.styleAcoustic')],
              ] as const).map(([style, label]) => (
                <label key={style} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={styles.includes(style)}
                    onChange={() => toggleStyle(style)}
                    className="h-4 w-4 rounded border-border bg-secondary"
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t('streaming.jingles.ai.styleNote')}
            </p>
          </div>
          <div>
            <label className="mb-2 block text-xs text-muted-foreground">{t('streaming.jingles.ai.energy')}</label>
            <div className="grid grid-cols-3 gap-2">
              {(['suave', 'media', 'alta'] as const).map((value) => (
                <label key={value} className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm capitalize ${energy === value ? 'border-brand bg-brand/10 text-brand' : 'border-border bg-background text-foreground'}`}>
                  <input
                    type="radio"
                    name="jingle-energy"
                    checked={energy === value}
                    onChange={() => setEnergy(value)}
                    className="sr-only"
                  />
                  {value === 'suave' ? t('streaming.jingles.ai.soft') : value === 'media' ? t('streaming.jingles.ai.medium') : t('streaming.jingles.ai.high')}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{t('streaming.jingles.ai.voiceover')}</label>
            <textarea className={`${input} resize-none`} rows={2} value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={300} />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t('streaming.jingles.ai.voiceoverNote')}
            </p>
          </div>
          <div>
            <label className="mb-2 block text-xs text-muted-foreground">{t('streaming.jingles.ai.duration')}</label>
            <div className="grid grid-cols-2 gap-2">
              {[10, 15].map((value) => (
                <label key={value} className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ${duration === value ? 'border-brand bg-brand/10 text-brand' : 'border-border bg-background text-foreground'}`}>
                  <input
                    type="radio"
                    name="jingle-duration"
                    checked={duration === value}
                    onChange={() => setDuration(value)}
                    className="sr-only"
                  />
                  {t('streaming.jingles.ai.seconds', { count: value })}
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

        {previewUrl && (
          <audio src={previewUrl} controls className="mt-4 w-full" preload="metadata" />
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary">
            {t('streaming.jingles.ai.cancel')}
          </button>
          <button
            onClick={() => void generate()}
            disabled={generating || !info?.musicEnabled || !info?.ttsEnabled}
            className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground hover:text-brand disabled:opacity-40"
          >
            <PlayIcon className="h-4 w-4" />
            {generating ? t('streaming.jingles.ai.generating') : t('streaming.jingles.ai.generate')}
          </button>
          <button
            onClick={() => void save()}
            disabled={!blob || saving}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {saving ? t('streaming.jingles.ai.publishing') : t('streaming.jingles.ai.publish')}
          </button>
        </div>
      </div>
    </div>
  )
}
