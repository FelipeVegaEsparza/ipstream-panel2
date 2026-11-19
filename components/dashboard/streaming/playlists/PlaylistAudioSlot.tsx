'use client'

import { useRef, useState } from 'react'
import { Pause, Play, Sparkles, Trash2, Upload } from 'lucide-react'
import { showToast } from '@/components/ui/toast'
import { JingleAiModal } from '@/app/dashboard/streaming/jingles/JingleAiModal'

export interface PlaylistAudio {
  id: string
  title: string
  duration: number | null
}

interface Props {
  playlistId: string
  playlistName: string
  field: 'introJingleId' | 'outroJingleId'
  kind: 'playlist_intro' | 'playlist_outro'
  title: string
  hint: string
  audio: PlaylistAudio | null
  defaultTagline: string
  onChanged: () => void
}

function fmtDuration(seconds: number | null) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function PlaylistAudioSlot({
  playlistId,
  playlistName,
  field,
  kind,
  title,
  hint,
  audio,
  defaultTagline,
  onChanged,
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const attach = async (jingleId: string) => {
    const res = await fetch(`/api/dashboard/streaming/playlists/${playlistId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: jingleId }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.message || data?.error || 'No se pudo vincular el audio a la playlist.')
    }
    if (audio?.id && audio.id !== jingleId) {
      await fetch(`/api/dashboard/streaming/jingles/${audio.id}`, { method: 'DELETE' }).catch(() => {})
    }
    onChanged()
  }

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (file.size > 50 * 1024 * 1024) {
      showToast({ type: 'info', title: 'El archivo supera el máximo de 50 MB.' })
      return
    }
    if (!/\.mp3$/i.test(file.name) && file.type !== 'audio/mpeg') {
      showToast({ type: 'info', title: 'Solo se aceptan archivos MP3.' })
      return
    }

    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('kind', kind)
      form.append('title', `${title} · ${playlistName}`.slice(0, 180))
      const res = await fetch('/api/dashboard/streaming/jingles', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || data?.error || 'No se pudo subir el audio.')
      const jingleId = data?.jingle?.id
      if (!jingleId) throw new Error('El audio se subió pero no se recibió su identificador.')
      await attach(jingleId)
      showToast({ type: 'success', title: 'Audio guardado.' })
    } catch (err) {
      showToast({ type: 'info', title: err instanceof Error ? err.message : 'No se pudo subir el audio.' })
    } finally {
      setUploading(false)
    }
  }

  const remove = async () => {
    if (!audio) return
    if (!confirm(`¿Quitar ${title.toLowerCase()} de esta playlist?`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/dashboard/streaming/playlists/${playlistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: null }),
      })
      if (!res.ok) throw new Error('No se pudo quitar el audio de la playlist.')
      await fetch(`/api/dashboard/streaming/jingles/${audio.id}`, { method: 'DELETE' }).catch(() => {})
      stopPlayback()
      onChanged()
    } catch (err) {
      showToast({ type: 'info', title: err instanceof Error ? err.message : 'No se pudo quitar el audio.' })
    } finally {
      setDeleting(false)
    }
  }

  const stopPlayback = () => {
    audioRef.current?.pause()
    audioRef.current = null
    setPlaying(false)
  }

  const togglePlay = () => {
    if (!audio) return
    if (playing) {
      stopPlayback()
      return
    }
    const player = new Audio(`/api/dashboard/streaming/jingles/${audio.id}/audio`)
    player.onended = () => setPlaying(false)
    player.onerror = () => {
      setPlaying(false)
      showToast({ type: 'info', title: 'No se pudo reproducir el audio.' })
    }
    audioRef.current = player
    player.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-medium text-foreground">{title}</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
        </div>
        {audio && (
          <span className="shrink-0 rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] text-brand">
            {fmtDuration(audio.duration)}
          </span>
        )}
      </div>

      {audio ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <button
            type="button"
            onClick={togglePlay}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-foreground hover:bg-secondary"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? 'Detener' : 'Escuchar'}
          </button>
          <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">
            {audio.title}
          </span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-[11px] text-brand hover:underline disabled:opacity-50"
          >
            Reemplazar
          </button>
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            disabled={uploading}
            className="inline-flex items-center gap-1 text-[11px] text-brand hover:underline disabled:opacity-50"
          >
            <Sparkles className="h-3 w-3" /> IA
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            className="inline-flex items-center gap-1 text-[11px] text-danger hover:underline disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" /> {deleting ? '...' : 'Quitar'}
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] text-foreground hover:bg-secondary disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" /> {uploading ? 'Subiendo...' : 'Subir audio'}
          </button>
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/10 px-3 py-1.5 text-[12px] text-brand hover:bg-brand/20 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" /> Crear con IA
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="audio/mpeg,.mp3"
        className="hidden"
        onChange={upload}
      />

      {aiOpen && (
        <JingleAiModal
          open={aiOpen}
          kind={kind}
          defaultTitle={`${title} · ${playlistName}`.slice(0, 180)}
          defaultTagline={defaultTagline}
          onClose={() => setAiOpen(false)}
          onSaved={(jingle) => {
            if (jingle?.id) {
              attach(jingle.id)
                .then(() => showToast({ type: 'success', title: 'Audio guardado.' }))
                .catch((err) =>
                  showToast({
                    type: 'info',
                    title: err instanceof Error ? err.message : 'No se pudo vincular el audio.',
                  })
                )
            }
          }}
        />
      )}
    </section>
  )
}
