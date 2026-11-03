'use client'

import { useEffect, useState } from 'react'
import { SparklesIcon } from '@heroicons/react/24/outline'
import type { LocalTrack } from '@/lib/live-console/types'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface SpecialTrack {
  id: string
  title: string
  artist: string | null
  duration: number | null
}

interface Special {
  id: string
  name: string
  artist: string
  tracks: SpecialTrack[]
  status?: string
}

export function SpecialsPanel({ onAdd }: { onAdd: (track: LocalTrack) => void }) {
  const { t } = useDashboardI18n()
  const [specials, setSpecials] = useState<Special[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/dashboard/streaming/specials', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('load'))))
      .then((data) => {
        if (!alive) return
        const list = Array.isArray(data.specials) ? data.specials : []
        setSpecials(
          list.filter((special: Special & { active?: boolean; ready?: boolean }) =>
            special.active !== false && special.ready !== false && special.status !== 'outside_window'
          )
        )
      })
      .catch(() => {
        if (alive) setError(t('live.specials.loadError'))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => { alive = false }
  }, [t])

  const playSpecial = (special: Special) => {
    if (special.tracks.length === 0) return
    const stamp = Date.now()
    const base = {
      album: null,
      size: 0,
      lastModified: stamp,
      mimeType: 'audio/mpeg',
      source: 'special' as const,
      available: true,
      kind: 'special' as const,
    }
    onAdd({
      ...base,
      id: `special-${special.id}-intro-${stamp}`,
      name: `${special.name} · intro`,
      path: '',
      title: `${special.name} · intro`,
      artist: special.artist || null,
      duration: null,
      audioUrl: `/api/dashboard/streaming/specials/${encodeURIComponent(special.id)}/audio?part=intro`,
    })
    for (const track of special.tracks) {
      onAdd({
        ...base,
        id: `special-${special.id}-${track.id}-${stamp}`,
        name: track.title,
        path: '',
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        audioUrl: `/api/dashboard/streaming/library/${encodeURIComponent(track.id)}/audio`,
      })
    }
    onAdd({
      ...base,
      id: `special-${special.id}-closing-${stamp}`,
      name: `${special.name} · cierre`,
      path: '',
      title: `${special.name} · cierre`,
      artist: special.artist || null,
      duration: null,
      audioUrl: `/api/dashboard/streaming/specials/${encodeURIComponent(special.id)}/audio?part=closing`,
    })
  }

  return (
    <aside className="flex flex-col gap-2 rounded-panel border border-border bg-card p-3">
      <div className="flex items-center gap-1.5">
        <SparklesIcon className="h-4 w-4 text-brand" />
        <h3 className="text-sm font-semibold text-foreground">{t('live.specials.title')}</h3>
      </div>
      {loading ? (
        <p className="text-[11px] text-muted-foreground">{t('live.specials.loading')}</p>
      ) : error ? (
        <p className="text-[11px] text-red-300">{error}</p>
      ) : specials.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">{t('live.specials.empty')}</p>
      ) : (
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {specials.map((special) => (
            <button
              key={special.id}
              type="button"
              onClick={() => playSpecial(special)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:border-brand hover:text-brand"
            >
              <span className="min-w-0 truncate">
                {special.name}
                {special.artist ? ` · ${special.artist}` : ''}
              </span>
              <span className="shrink-0">{t('live.specials.play')}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  )
}
