'use client'

import { useEffect, useState } from 'react'
import { CheckCircleIcon, MusicalNoteIcon } from '@heroicons/react/24/outline'
import { EffectPreviewButton } from '@/components/sound-effects/EffectPreviewButton'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface MusicTrack {
  id: string
  name: string
  artist: string | null
  url: string
  duration: number | null
  size: number
  mimeType: string
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function JingleMusicSelector() {
  const { t } = useDashboardI18n()
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/dashboard/streaming/jingles/music', { cache: 'no-store' })
        if (!res.ok) throw new Error(t('streaming.jingles.music.loadError'))
        const data = await res.json()
        setTracks(Array.isArray(data.tracks) ? data.tracks : [])
        setSelectedId(typeof data.selectedId === 'string' ? data.selectedId : null)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('streaming.jingles.music.loadError'))
      } finally {
        setLoading(false)
      }
    })()
  }, [t])

  const save = async () => {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch('/api/dashboard/streaming/jingles/music', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ musicTrackId: selectedId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || data.error || t('streaming.jingles.music.saveError'))
      setNotice(t('streaming.jingles.music.saved'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('streaming.jingles.music.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-card/60 border border-border rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <MusicalNoteIcon className="h-5 w-5 text-brand" />
            {t('streaming.jingles.music.title')}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('streaming.jingles.music.subtitle')}
          </p>
        </div>
        <span className="rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground">
          {t('streaming.jingles.music.selectedCount', { count: selectedId ? 1 : 0 })}
        </span>
      </div>

      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
      {notice && (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          <CheckCircleIcon className="h-4 w-4 shrink-0" />
          {notice}
        </p>
      )}

      {loading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('streaming.jingles.music.loading')}</p>
      ) : tracks.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('streaming.jingles.music.empty')}</p>
      ) : (
        <ul className="divide-y divide-border">
          <li className="flex items-center gap-3 py-2">
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
              <input
                type="radio"
                name="jingle-music"
                checked={selectedId === null}
                onChange={() => setSelectedId(null)}
                className="h-4 w-4 accent-[var(--brand-500)]"
              />
              <span className="text-sm text-muted-foreground">{t('streaming.jingles.music.none')}</span>
            </label>
          </li>
          {tracks.map((track) => (
            <li key={track.id} className="flex flex-wrap items-center gap-3 py-2">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="jingle-music"
                  checked={selectedId === track.id}
                  onChange={() => setSelectedId(track.id)}
                  className="h-4 w-4 accent-[var(--brand-500)]"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{track.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {track.artist ? `${track.artist} · ` : ''}{formatDuration(track.duration)}
                  </span>
                </span>
              </label>
              <EffectPreviewButton src={track.url} name={track.name} />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-[11px] text-muted-foreground">{t('streaming.jingles.music.hint')}</p>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || loading}
          className="rounded-lg bg-brand px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? t('streaming.jingles.music.saving') : t('streaming.jingles.music.save')}
        </button>
      </div>
    </section>
  )
}
