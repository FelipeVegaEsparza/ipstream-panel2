'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUpTrayIcon, MusicalNoteIcon, TrashIcon } from '@heroicons/react/24/outline'
import { EffectPreviewButton } from '@/components/sound-effects/EffectPreviewButton'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface AdminMusicTrack {
  id: string
  name: string
  artist: string | null
  fileName: string
  mimeType: string
  url: string
  size: number
  duration: number | null
  active: boolean
  createdAt: string
  _count?: { radioStreams: number }
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function MusicLibraryManager() {
  const { t } = useDashboardI18n()
  const [tracks, setTracks] = useState<AdminMusicTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [artist, setArtist] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)

  const load = async () => {
    setError(null)
    try {
      const res = await fetch('/api/admin/music', { cache: 'no-store' })
      if (!res.ok) throw new Error(t('admin.music.loadError'))
      const data = await res.json()
      setTracks(Array.isArray(data.tracks) ? data.tracks : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.music.loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const upload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setError(t('admin.music.chooseFile'))
      return
    }
    setUploading(true)
    setError(null)
    setNotice(null)
    try {
      const form = new FormData()
      form.append('file', file)
      if (name.trim()) form.append('name', name.trim())
      if (artist.trim()) form.append('artist', artist.trim())
      const res = await fetch('/api/admin/music', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || data.error || t('admin.music.uploadError'))
      setName('')
      setArtist('')
      if (fileRef.current) fileRef.current.value = ''
      setNotice(t('admin.music.uploaded'))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.music.uploadError'))
    } finally {
      setUploading(false)
    }
  }

  const remove = async (track: AdminMusicTrack) => {
    if (!window.confirm(t('admin.music.deleteConfirm', { name: track.name }))) return
    setDeletingId(track.id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/music/${track.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(t('admin.music.deleteError'))
      setTracks((prev) => prev.filter((item) => item.id !== track.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.music.deleteError'))
    } finally {
      setDeletingId(null)
    }
  }

  const toggleActive = async (track: AdminMusicTrack) => {
    setTogglingId(track.id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/music/${track.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !track.active }),
      })
      if (!res.ok) throw new Error(t('admin.music.updateError'))
      setTracks((prev) => prev.map((item) => item.id === track.id ? { ...item, active: !track.active } : item))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.music.updateError'))
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('admin.music.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('admin.music.subtitle')}</p>
      </div>

      <section className="card space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MusicalNoteIcon className="h-4 w-4 text-brand" />
          {t('admin.music.add')}
        </h2>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,220px)_minmax(0,220px)_auto] md:items-end">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">{t('admin.music.audioFile')}</span>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.oga,.opus,.m4a,.aac,.flac,.webm"
              className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:py-1.5 file:text-xs file:text-foreground"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">{t('admin.music.visibleName')}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              placeholder={t('admin.music.namePlaceholder')}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-brand"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">{t('admin.music.artist')}</span>
            <input
              value={artist}
              onChange={(event) => setArtist(event.target.value)}
              maxLength={120}
              placeholder={t('admin.music.artistPlaceholder')}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-brand"
            />
          </label>
          <button
            type="button"
            onClick={() => void upload()}
            disabled={uploading}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            {uploading ? t('admin.music.uploading') : t('admin.music.upload')}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">{t('admin.music.formats')}</p>
        {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
        {notice && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{notice}</p>}
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">{t('admin.music.library')}</h2>
          <span className="rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground">
            {tracks.length === 1 ? t('admin.music.countOne', { count: tracks.length }) : t('admin.music.countMany', { count: tracks.length })}
          </span>
        </div>
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('admin.music.loading')}</p>
        ) : tracks.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('admin.music.empty')}</p>
        ) : (
          <ul className="divide-y divide-border">
            {tracks.map((track) => (
              <li key={track.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {track.name}
                    {!track.active && <span className="ml-2 rounded-full bg-secondary px-1.5 py-0.5 text-[9px] text-muted-foreground">{t('admin.music.inactive')}</span>}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {track.artist ? `${track.artist} · ` : ''}{formatDuration(track.duration)} · {formatSize(track.size)}
                    {track._count?.radioStreams ? ` · ${track._count.radioStreams === 1 ? t('admin.music.clientsOne', { count: track._count.radioStreams }) : t('admin.music.clientsMany', { count: track._count.radioStreams })}` : ''}
                  </p>
                </div>
                <EffectPreviewButton src={track.url} name={track.name} />
                <button
                  type="button"
                  onClick={() => void toggleActive(track)}
                  disabled={togglingId === track.id}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
                >
                  {track.active ? t('admin.music.deactivate') : t('admin.music.activate')}
                </button>
                <button
                  type="button"
                  onClick={() => void remove(track)}
                  disabled={deletingId === track.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  {deletingId === track.id ? t('admin.music.deleting') : t('admin.music.delete')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
