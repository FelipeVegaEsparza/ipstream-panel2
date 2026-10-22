'use client'

import { useEffect, useRef, useState } from 'react'
import { XMarkIcon, SparklesIcon, PlayIcon, PlusIcon } from '@heroicons/react/24/outline'
import { showToast } from '@/components/ui/toast'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

const MAX_CHARS = 300

interface Props {
  open: boolean
  onClose: () => void
  generate: (text: string) => Promise<Blob>
  onAdd: (blob: Blob, text: string) => void
}

export function AiLocutionModal({ open, onClose, generate, onAdd }: Props) {
  const { t } = useDashboardI18n()
  const [text, setText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const previewRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (open) return
    setText('')
    setGenerating(false)
    setError(null)
    setBlob(null)
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

  const remaining = MAX_CHARS - text.length
  const estimated = Math.max(1, Math.ceil(text.trim().length / 14))

  async function handleGenerate() {
    if (!text.trim() || generating) return
    setGenerating(true)
    setError(null)
    setBlob(null)
    try {
      const generated = await generate(text.trim())
      setBlob(generated)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('live.locution.error'))
    } finally {
      setGenerating(false)
    }
  }

  function handleAdd() {
    if (!blob || !text.trim()) return
    onAdd(blob, text.trim())
    showToast({ type: 'success', title: t('live.locution.added') })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('live.locution.create')}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-soft"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <SparklesIcon className="h-5 w-5 text-brand" />
              {t('live.locution.title')}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('live.locution.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label={t('live.locution.close')}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, MAX_CHARS))}
          rows={5}
          autoFocus
          placeholder={t('live.locution.placeholder')}
          className="mt-4 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
        />
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{t('live.locution.remaining', { count: remaining })}</span>
          <span>≈ {estimated} s</span>
        </div>

        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}

        {previewUrl && (
          <audio
            ref={previewRef}
            src={previewUrl}
            controls
            className="mt-3 w-full"
            preload="metadata"
          />
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary"
          >
            {t('live.locution.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={!text.trim() || generating}
            className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground hover:text-brand disabled:opacity-40"
          >
            <PlayIcon className="h-4 w-4" />
            {generating ? t('live.locution.generating') : t('live.locution.generate')}
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!blob}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            <PlusIcon className="h-4 w-4" />
            {t('live.locution.add')}
          </button>
        </div>
      </div>
    </div>
  )
}
