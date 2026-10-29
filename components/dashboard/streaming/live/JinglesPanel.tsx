'use client'

import { useEffect, useRef, useState } from 'react'
import { MusicalNoteIcon, PlayIcon, PlusIcon, StopIcon } from '@heroicons/react/24/outline'
import { formatTime, mimeForName } from '@/lib/live-console/audio-math'
import type { LocalTrack } from '@/lib/live-console/types'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Jingle {
  id: string
  title: string
  artist: string | null
  duration: number
  fileName: string
  fileSize?: number
  coverUrl?: string | null
}

const DRAG_TYPE = 'application/x-ipstream-track'

function jingleToTrack(jingle: Jingle): LocalTrack {
  return {
    id: jingle.id,
    name: jingle.title || jingle.fileName || 'Jingle',
    path: `jingle:${jingle.id}`,
    title: jingle.title || jingle.fileName || 'Jingle',
    artist: jingle.artist,
    album: null,
    duration: jingle.duration ?? null,
    size: jingle.fileSize ?? 0,
    lastModified: 0,
    mimeType: mimeForName(jingle.fileName || '') || 'audio/mpeg',
    source: 'jingle',
    handle: null,
    file: null,
    audioUrl: `/api/dashboard/streaming/jingles/${jingle.id}/audio`,
    available: true,
    kind: 'jingle',
  }
}

export function JinglesPanel({
  onAdd,
}: {
  onAdd: (track: LocalTrack) => void
}) {
  const { t } = useDashboardI18n()
  const [jingles, setJingles] = useState<Jingle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/dashboard/streaming/jingles', { cache: 'no-store' })
        if (!res.ok) throw new Error(t('live.jingles.error'))
        const data = await res.json()
        setJingles(Array.isArray(data.jingles) ? data.jingles : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : t('live.jingles.error'))
      } finally {
        setLoading(false)
      }
    })()
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  const stopPreview = () => {
    audioRef.current?.pause()
    audioRef.current = null
    setPlayingId(null)
  }

  const togglePreview = (jingle: Jingle) => {
    if (playingId === jingle.id) {
      stopPreview()
      return
    }
    stopPreview()
    const audio = new Audio(`/api/dashboard/streaming/jingles/${jingle.id}/audio`)
    audio.onended = () => setPlayingId(null)
    audio.onerror = () => setPlayingId(null)
    audio.play().then(() => setPlayingId(jingle.id)).catch(() => setPlayingId(null))
    audioRef.current = audio
  }

  return (
  <aside className="flex min-h-[180px] flex-col rounded-panel border border-border bg-card p-3 ">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <MusicalNoteIcon className="h-4 w-4 text-brand" />
          Jingles
        </h2>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] text-muted-foreground">
          {jingles.length}
        </span>
      </div>
      <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
        {t('live.jingles.subtitle')}
      </p>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <p className="py-3 text-[10px] text-muted-foreground">{t('live.jingles.loading')}</p>
        ) : error ? (
          <p className="py-3 text-[10px] text-red-300">{error}</p>
        ) : jingles.length === 0 ? (
          <p className="py-3 text-[10px] text-muted-foreground">
            {t('live.jingles.empty')}
          </p>
        ) : (
          <ul className="space-y-1">
            {jingles.map((jingle) => {
              const track = jingleToTrack(jingle)
              return (
                <li
                  key={jingle.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(track))
                    event.dataTransfer.effectAllowed = 'copy'
                  }}
                  className="group flex cursor-grab items-center gap-1.5 rounded-lg border border-transparent px-1.5 py-1.5 transition-colors hover:border-border hover:bg-secondary/60 active:cursor-grabbing"
                  title={t('live.jingles.drag')}
                >
                  <button
                    type="button"
                    onClick={() => togglePreview(jingle)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:text-brand"
                    title={playingId === jingle.id ? t('live.jingles.stop', { name: jingle.title }) : t('live.jingles.listen', { name: jingle.title })}
                    aria-label={playingId === jingle.id ? t('live.jingles.stop', { name: jingle.title }) : t('live.jingles.listen', { name: jingle.title })}
                  >
                    {playingId === jingle.id
                      ? <StopIcon className="h-3.5 w-3.5" />
                      : <PlayIcon className="h-3.5 w-3.5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-foreground">{jingle.title}</p>
                    <p className="truncate text-[9px] text-muted-foreground">
                      {jingle.artist || 'Jingle'} · {formatTime(jingle.duration)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAdd(track)}
                    className="rounded-md p-1 text-muted-foreground opacity-70 transition-colors hover:text-brand group-hover:opacity-100"
                    title={t('live.jingles.add', { name: jingle.title })}
                    aria-label={t('live.jingles.add', { name: jingle.title })}
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
