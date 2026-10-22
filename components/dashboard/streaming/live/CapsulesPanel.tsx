'use client'

import { useEffect, useRef, useState } from 'react'
import { InformationCircleIcon, PlayIcon, PlusIcon, StopIcon } from '@heroicons/react/24/outline'
import { formatTime, mimeForName } from '@/lib/live-console/audio-math'
import type { LocalTrack } from '@/lib/live-console/types'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Capsule {
  id: string
  title: string
  description: string | null
  fileName: string
  mimeType: string
  url: string
  duration: number | null
  category: { id: string; name: string } | null
}

const DRAG_TYPE = 'application/x-ipstream-track'

function capsuleToTrack(capsule: Capsule, defaults: { name: string; artist: string }): LocalTrack {
  return {
    id: capsule.id,
    name: capsule.title || capsule.fileName || defaults.name,
    path: `capsule:${capsule.id}`,
    title: capsule.title || capsule.fileName || defaults.name,
    artist: capsule.category?.name || defaults.artist,
    album: null,
    duration: capsule.duration,
    size: 0,
    lastModified: 0,
    mimeType: capsule.mimeType || mimeForName(capsule.fileName || '') || 'audio/mpeg',
    source: 'capsule',
    handle: null,
    file: null,
    audioUrl: capsule.url,
    available: true,
    kind: 'capsule',
  }
}

export function CapsulesPanel({ onAdd }: { onAdd: (track: LocalTrack) => void }) {
  const { t } = useDashboardI18n()
  const [capsules, setCapsules] = useState<Capsule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/dashboard/info-capsules', { cache: 'no-store' })
        if (!res.ok) throw new Error(t('live.capsules.error'))
        const data = await res.json()
        const selected = new Set<string>(Array.isArray(data.selectedIds) ? data.selectedIds : [])
        const list = Array.isArray(data.capsules) ? data.capsules : []
        setCapsules(list.filter((capsule: Capsule) => selected.has(capsule.id)))
      } catch (err) {
        setError(err instanceof Error ? err.message : t('live.capsules.error'))
      } finally { setLoading(false) }
    })()
    return () => { audioRef.current?.pause(); audioRef.current = null }
  }, [])

  const stopPreview = () => { audioRef.current?.pause(); audioRef.current = null; setPlayingId(null) }
  const togglePreview = (capsule: Capsule) => {
    if (playingId === capsule.id) { stopPreview(); return }
    stopPreview()
    const audio = new Audio(capsule.url)
    audio.onended = () => setPlayingId(null)
    audio.onerror = () => setPlayingId(null)
    audio.play().then(() => setPlayingId(capsule.id)).catch(() => setPlayingId(null))
    audioRef.current = audio
  }

  return (
    <aside className="flex min-h-[160px] flex-col rounded-xl border border-border bg-card p-3 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <InformationCircleIcon className="h-4 w-4 text-brand" />
          {t('live.capsules.title')}
        </h2>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] text-muted-foreground">{capsules.length}</span>
      </div>
      <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
        {t('live.capsules.subtitle')}
      </p>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
        {loading ? <p className="py-3 text-[10px] text-muted-foreground">{t('live.capsules.loading')}</p> : error ? <p className="py-3 text-[10px] text-red-300">{error}</p> : capsules.length === 0 ? <p className="py-3 text-[10px] text-muted-foreground">{t('live.capsules.empty')}</p> : (
          <ul className="space-y-1">
            {capsules.map((capsule) => {
              const track = capsuleToTrack(capsule, { name: t('live.capsules.defaultName'), artist: t('live.capsules.defaultArtist') })
              return (
                <li key={capsule.id} draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(track))
                    event.dataTransfer.effectAllowed = 'copy'
                  }}
                  className="group flex cursor-grab items-center gap-1.5 rounded-lg border border-transparent px-1.5 py-1.5 transition-colors hover:border-border hover:bg-secondary/60 active:cursor-grabbing"
                  title={t('live.capsules.drag')}
                >
                  <button type="button" onClick={() => togglePreview(capsule)} className="rounded-md p-1 text-muted-foreground hover:text-brand" title={playingId === capsule.id ? t('live.capsules.stop', { name: capsule.title }) : t('live.capsules.listen', { name: capsule.title })}>
                    {playingId === capsule.id ? <StopIcon className="h-3.5 w-3.5" /> : <PlayIcon className="h-3.5 w-3.5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-foreground">{capsule.title}</p>
                    <p className="truncate text-[9px] text-muted-foreground">{capsule.category?.name || t('live.capsules.default')} · {formatTime(capsule.duration)}</p>
                  </div>
                  <button type="button" onClick={() => onAdd(track)} className="rounded-md p-1 text-muted-foreground opacity-70 hover:text-brand group-hover:opacity-100" title={t('live.capsules.add', { name: capsule.title })} aria-label={t('live.capsules.add', { name: capsule.title })}>
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
