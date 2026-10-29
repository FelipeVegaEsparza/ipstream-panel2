'use client'

import { showToast } from '@/components/ui/toast'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import { JingleAiModal } from './JingleAiModal'
import { JingleMusicSelector } from './JingleMusicSelector'

import { useEffect, useState, useRef } from 'react'
import { CameraIcon, MusicalNoteIcon, PlayIcon, StopIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface Jingle {
  id: string
  title: string
  artist: string | null
  duration: number
  fileName: string
  fileSize: number
  coverUrl: string | null
  uploadedAt: string
}

interface JingleConfig {
  jinglePlayEvery: number
  jinglePlayCount: number
}

function fmtDuration(seconds: number | null) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function JinglesPage() {
  const { t } = useDashboardI18n()
  const [jingles, setJingles] = useState<Jingle[]>([])
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<JingleConfig>({ jinglePlayEvery: 5, jinglePlayCount: 1 })
  const [configEvery, setConfigEvery] = useState(5)
  const [configCount, setConfigCount] = useState(1)
  const [configSaving, setConfigSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editArtist, setEditArtist] = useState('')
  const [coverUploadingId, setCoverUploadingId] = useState<string | null>(null)
  const [coverDeletingId, setCoverDeletingId] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [coverJingleId, setCoverJingleId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const [jRes, cRes] = await Promise.all([
        fetch('/api/dashboard/streaming/jingles', { cache: 'no-store' }),
        fetch('/api/dashboard/streaming/jingles/config', { cache: 'no-store' }),
      ])
      if (jRes.ok) {
        const data = await jRes.json()
        setJingles(data.jingles || [])
      }
      if (cRes.ok) {
        const data: JingleConfig = await cRes.json()
        setConfig(data)
        setConfigEvery(data.jinglePlayEvery)
        setConfigCount(data.jinglePlayCount)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const saveConfig = async () => {
    setConfigSaving(true)
    try {
      const res = await fetch('/api/dashboard/streaming/jingles/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jinglePlayEvery: configEvery, jinglePlayCount: configCount }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message || t('streaming.jingles.errorSaveConfig'))
      }
      const data = await res.json()
      setConfig({ jinglePlayEvery: data.jinglePlayEvery, jinglePlayCount: data.jinglePlayCount })
    } catch (err: any) {
      showToast({ type: 'info', title: err.message })
    } finally {
      setConfigSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(t('streaming.jingles.confirmDelete', { name }))) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/dashboard/streaming/jingles/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(t('streaming.jingles.errorDelete'))
      await load()
    } catch (err: any) {
      showToast({ type: 'info', title: err.message })
    } finally {
      setDeletingId(null)
    }
  }

  const startEdit = (j: Jingle) => {
    setEditingId(j.id)
    setEditTitle(j.title)
    setEditArtist(j.artist || '')
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/dashboard/streaming/jingles/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, artist: editArtist || null }),
      })
      if (!res.ok) throw new Error(t('streaming.jingles.errorSave'))
      setEditingId(null)
      await load()
    } catch (err: any) {
      showToast({ type: 'info', title: err.message })
    } finally {
      setSavingEdit(false)
    }
  }

  const handleCoverUpload = async (jingleId: string, file: File) => {
    setCoverUploadingId(jingleId)
    try {
      const form = new FormData()
      form.append('cover', file)
      const res = await fetch(`/api/dashboard/streaming/jingles/${jingleId}/cover`, {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message || `HTTP ${res.status}`)
      }
      await load()
    } catch (err: any) {
      showToast({ type: 'info', title: err.message })
    } finally {
      setCoverUploadingId(null)
      setCoverJingleId(null)
    }
  }

  const handleCoverDelete = async (jingleId: string) => {
    if (!confirm(t('streaming.jingles.confirmDeleteCover'))) return
    setCoverDeletingId(jingleId)
    try {
      const res = await fetch(`/api/dashboard/streaming/jingles/${jingleId}/cover`, { method: 'DELETE' })
      if (!res.ok) throw new Error(t('streaming.jingles.errorDeleteCover'))
      await load()
    } catch (err: any) {
      showToast({ type: 'info', title: err.message })
    } finally {
      setCoverDeletingId(null)
    }
  }

  const togglePlay = (id: string, title: string) => {
    if (playingId === id) {
      audioRef.current?.pause()
      audioRef.current = null
      setPlayingId(null)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      const audio = new Audio(`/api/dashboard/streaming/jingles/${id}/audio`)
      audio.onended = () => setPlayingId(null)
      audio.onerror = () => {
        setPlayingId(null)
        showToast({ type: 'error', title: t('streaming.jingles.errorPlay', { name: title }) })
      }
      audio.play().catch(() => {
        setPlayingId(null)
        showToast({ type: 'error', title: t('streaming.jingles.errorPlay', { name: title }) })
      })
      audioRef.current = audio
      setPlayingId(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('streaming.jingles.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('streaming.jingles.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAiOpen(true)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {t('streaming.jingles.createAi')}
        </button>
      </div>

      {/* Config card */}
   <div className="bg-card/60 border border-border rounded-panel p-5">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('streaming.jingles.insertRule')}</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">{t('streaming.jingles.everySongs')}</label>
            <input
              type="number"
              min={1}
              max={100}
              value={configEvery}
              onChange={(e) => setConfigEvery(Math.max(1, parseInt(e.target.value) || 1))}
              className="bg-background text-foreground px-3 py-2 rounded w-24 border border-border"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">{t('streaming.jingles.playJingles')}</label>
            <input
              type="number"
              min={1}
              max={20}
              value={configCount}
              onChange={(e) => setConfigCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="bg-background text-foreground px-3 py-2 rounded w-24 border border-border"
            />
          </div>
          <button
            onClick={saveConfig}
            disabled={configSaving}
            className="bg-brand hover:bg-brand text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {configSaving ? t('streaming.jingles.savingRule') : t('streaming.jingles.saveRule')}
          </button>
          <p className="text-xs text-muted-foreground ml-2">
            {t('streaming.jingles.example', { every: configEvery, count: configCount, plural: configCount !== 1 ? 's' : '' })}
            {config.jinglePlayEvery !== configEvery || config.jinglePlayCount !== configCount ? ` ${t('streaming.jingles.unsaved')}` : ''}
          </p>
        </div>
      </div>

      <JingleMusicSelector />

      {/* Upload zone */}
   <div className="bg-card/60 border border-border rounded-panel p-5">
        <h2 className="text-lg font-semibold text-foreground mb-3">{t('streaming.jingles.uploadTitle')}</h2>
        <input
          type="file"
          accept=".mp3,audio/mpeg"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            try {
              const form = new FormData()
              form.append('file', file)
              const res = await fetch('/api/dashboard/streaming/jingles', {
                method: 'POST',
                body: form,
              })
              if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data?.message || `HTTP ${res.status}`)
              }
              await load()
            } catch (err: any) {
              showToast({ type: 'info', title: err.message })
            }
            e.target.value = ''
          }}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-brand file:text-white hover:file:bg-brand cursor-pointer"
        />
      </div>

      <JingleAiModal open={aiOpen} onClose={() => setAiOpen(false)} onSaved={() => void load()} />

      {/* Table */}
   <div className="bg-card rounded-lg overflow-x-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {loading ? t('streaming.jingles.loading') : t('streaming.jingles.count', { count: jingles.length, plural: jingles.length !== 1 ? 's' : '' })}
          </h2>
          <a href="/dashboard/streaming" className="text-sm text-brand hover:text-brand">
            {t('streaming.jingles.back')}
          </a>
        </div>
        {jingles.length === 0 && !loading ? (
          <div className="p-12 text-center text-muted-foreground">
            {t('streaming.jingles.empty')}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-background/50 text-muted-foreground uppercase text-xs">
              <tr>
        <th className="w-10 p-3 text-left"><span className="sr-only">{t('streaming.jingles.preview')}</span></th>
                <th className="text-left p-3 w-12">{t('streaming.jingles.cover')}</th>
                <th className="text-left p-3">{t('streaming.jingles.songTitle')}</th>
                <th className="text-left p-3 hidden sm:table-cell">{t('streaming.jingles.artist')}</th>
                <th className="text-left p-3">{t('streaming.jingles.duration')}</th>
                <th className="text-left p-3 hidden md:table-cell">{t('streaming.jingles.size')}</th>
                <th className="text-right p-3">{t('streaming.jingles.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {jingles.map((j) => (
                <tr key={j.id} className="border-t border-border/50 hover:bg-secondary/20">
                  <td className="p-3">
                    <button
                      onClick={() => togglePlay(j.id, j.title)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                        playingId === j.id
                          ? 'bg-green-600 text-white'
                          : 'bg-secondary text-muted-foreground hover:bg-secondary'
                      }`}
                      title={playingId === j.id ? t('streaming.jingles.stop') : t('streaming.jingles.preview')}
                    >
           {playingId === j.id ? <StopIcon className="h-3.5 w-3.5" /> : <PlayIcon className="h-3.5 w-3.5" />}
                    </button>
                  </td>
                  <td className="p-3">
                    {editingId === j.id ? (
                      <div className="relative">
                        <img
                          src={j.coverUrl || ''}
                          alt=""
                          className={`w-10 h-10 rounded object-cover shadow-sm ${!j.coverUrl ? 'hidden' : ''}`}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                        {!j.coverUrl && (
             <div className="flex h-10 w-10 items-center justify-center rounded-control bg-surface-3">
              <MusicalNoteIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleCoverUpload(j.id, file)
                          }}
                        />
                        <button
                          onClick={() => {
                            setCoverJingleId(j.id)
                            coverInputRef.current?.click()
                          }}
                          disabled={coverUploadingId === j.id || coverDeletingId === j.id}
                          className="absolute -bottom-1 -right-1 w-5 h-5 bg-brand rounded-full flex items-center justify-center text-white text-xs hover:bg-brand disabled:opacity-50"
                          title={t('streaming.jingles.uploadCover')}
                        >
             {coverUploadingId === j.id ? '…' : <CameraIcon className="h-3 w-3" />}
                        </button>
                        {j.coverUrl && (
                          <button
                            onClick={() => handleCoverDelete(j.id)}
                            disabled={coverDeletingId === j.id}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-white text-[8px] hover:bg-red-500 disabled:opacity-50"
                            title={t('streaming.jingles.deleteCover')}
                          >
              {coverDeletingId === j.id ? '…' : <XMarkIcon className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
                    ) : (
                      j.coverUrl ? (
                        <img
                          src={j.coverUrl}
                          alt=""
                          className="w-10 h-10 rounded object-cover shadow-sm"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-control bg-surface-3">
             <MusicalNoteIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )
                    )}
                  </td>
                  <td className="p-3 text-foreground">
                    {editingId === j.id ? (
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="bg-background text-foreground px-2 py-1 rounded w-full"
                      />
                    ) : (
                      j.title
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground hidden sm:table-cell">
                    {editingId === j.id ? (
                      <input
                        value={editArtist}
                        onChange={(e) => setEditArtist(e.target.value)}
                        placeholder={t('streaming.jingles.noArtist')}
                        className="bg-background text-foreground px-2 py-1 rounded w-full"
                      />
                    ) : (
                      j.artist || <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{fmtDuration(j.duration)}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{fmtSize(j.fileSize)}</td>
                  <td className="p-3 text-right">
                    {editingId === j.id ? (
                      <>
                        <button onClick={saveEdit} disabled={savingEdit} className="text-green-400 hover:text-green-300 disabled:text-green-700 mr-3 text-xs">
                          {savingEdit ? t('streaming.jingles.saving') : t('streaming.jingles.save')}
                        </button>
                        <button onClick={() => { if (!savingEdit) setEditingId(null) }} className="text-muted-foreground hover:text-muted-foreground text-xs disabled:opacity-50" disabled={savingEdit}>
                          {t('streaming.jingles.cancel')}
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(j)} className="text-brand hover:text-brand mr-3 text-xs">{t('streaming.jingles.edit')}</button>
                        <button
                          onClick={() => handleDelete(j.id, j.title)}
                          disabled={deletingId === j.id}
                          className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50"
                        >
                          {deletingId === j.id ? t('streaming.jingles.deleting') : t('streaming.jingles.delete')}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
