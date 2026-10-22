'use client'

import { showToast } from '@/components/ui/toast'

// =====================================================
// Page — /dashboard/streaming/playlists/[id]
// =====================================================
// Editor: agregar tracks desde la biblioteca, drag&drop para reordenar.

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Track {
  id: string
  title: string
  artist: string | null
  duration: number | null
  fileName: string
  coverUrl: string | null
  folderId: string | null
}

interface Folder {
  id: string
  name: string
  parentId: string | null
}

interface Entry {
  entryId: string
  order: number
  trackId: string
  capsuleId?: string | null
  title: string
  artist: string | null
  duration: number | null
  fileName: string
  coverUrl: string | null
}

interface Playlist {
  id: string
  name: string
  description: string | null
  isActive: boolean
  shuffle: boolean
  repeat: boolean
  trackCount: number
  totalDuration: number | null
  entries: Entry[]
}

function fmtDuration(seconds: number | null) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function PlaylistEditorPage() {
  const { t } = useDashboardI18n()
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [library, setLibrary] = useState<Track[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [folderFilter, setFolderFilter] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState(true)
  const [activating, setActivating] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const [loadedTrackIds, setLoadedTrackIds] = useState('')
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const dragStateRef = useRef<{ from: number; to: number } | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set())
  const [addingBulk, setAddingBulk] = useState(false)
  const [showCapsules, setShowCapsules] = useState(false)
  const [capsules, setCapsules] = useState<Array<{ id: string; title: string; description: string | null; category: { name: string } | null }>>([])
  const [loadingCapsules, setLoadingCapsules] = useState(false)
  const [addingCapsuleId, setAddingCapsuleId] = useState<string | null>(null)

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
      const audio = new Audio(`/api/dashboard/streaming/library/${id}/audio`)
      audio.onended = () => setPlayingId(null)
      audio.onerror = () => {
        setPlayingId(null)
        showToast({ type: 'error', title: t('streaming.playlistDetail.playError', { title }) })
      }
      audio.play().catch(() => {
        setPlayingId(null)
        showToast({ type: 'error', title: t('streaming.playlistDetail.playError', { title }) })
      })
      audioRef.current = audio
      setPlayingId(id)
    }
  }

  const load = async () => {
    try {
      setLoading(true)
      const [plRes, libRes, foldersRes] = await Promise.all([
        fetch(`/api/dashboard/streaming/playlists/${id}`, { cache: 'no-store' }),
        fetch('/api/dashboard/streaming/library', { cache: 'no-store' }),
        fetch('/api/dashboard/streaming/library/folders', { cache: 'no-store' }),
      ])
      if (plRes.ok) {
        const data = await plRes.json()
        setPlaylist(data)
        setLoadedTrackIds(data.entries.map((e: Entry) => e.trackId).join(','))
        setName(data.name)
        setDesc(data.description || '')
        setShuffle(data.shuffle)
        setRepeat(data.repeat)
      }
      if (libRes.ok) {
        const data = await libRes.json()
        setLibrary(data.tracks || [])
      }
      if (foldersRes.ok) {
        const data = await foldersRes.json()
        setFolders(data.folders || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const startEdit = () => {
    setEditing(true)
  }

  const saveEdit = async () => {
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/dashboard/streaming/playlists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: desc || null,
          shuffle,
          repeat,
        }),
      })
      if (!res.ok) throw new Error(t('streaming.playlistDetail.saveError'))
      setEditing(false)
      await load()
    } catch (err: any) {
      showToast({ type: 'info', title: err.message })
    } finally {
      setSavingEdit(false)
    }
  }

  const activate = async () => {
    setActivating(true)
    try {
      const res = await fetch(`/api/dashboard/streaming/playlists/${id}/activate`, { method: 'POST' })
      if (!res.ok) throw new Error(t('streaming.playlistDetail.activateError'))
      await load()
    } catch (err: any) {
      showToast({ type: 'info', title: err.message })
    } finally {
      setActivating(false)
    }
  }

  const addTrack = async (trackId: string) => {
    try {
      const res = await fetch(`/api/dashboard/streaming/playlists/${id}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message || t('streaming.playlistDetail.addError'))
      }
      setShowAdd(false)
      setSearch('')
      await load()
    } catch (err: any) {
      showToast({ type: 'info', title: err.message })
    }
  }

  const toggleSelectTrack = (trackId: string) => {
    setSelectedTrackIds((prev) => {
      const next = new Set(prev)
      if (next.has(trackId)) next.delete(trackId)
      else next.add(trackId)
      return next
    })
  }

  const toggleSelectAll = (allSelected: boolean, ids: string[]) => {
    if (allSelected) {
      setSelectedTrackIds(new Set())
    } else {
      setSelectedTrackIds(new Set(ids))
    }
  }

  const bulkAddTracks = async () => {
    const ids = Array.from(selectedTrackIds)
    if (ids.length === 0) return
    setAddingBulk(true)
    try {
      const res = await fetch(`/api/dashboard/streaming/playlists/${id}/tracks/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackIds: ids }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message || t('streaming.playlistDetail.addTracksError'))
      }
      setShowAdd(false)
      setSearch('')
      setSelectedTrackIds(new Set())
      await load()
    } catch (err: any) {
      showToast({ type: 'info', title: err.message })
    } finally {
      setAddingBulk(false)
    }
  }

  const openCapsules = async () => {
    setShowCapsules(true)
    setLoadingCapsules(true)
    try {
      const res = await fetch('/api/dashboard/info-capsules', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setCapsules(Array.isArray(data.capsules) ? data.capsules : [])
      }
    } finally { setLoadingCapsules(false) }
  }

  const addCapsule = async (capsuleId: string) => {
    setAddingCapsuleId(capsuleId)
    try {
      const res = await fetch(`/api/dashboard/streaming/playlists/${id}/capsules`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capsuleId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || data.error || t('streaming.playlistDetail.addCapsuleError'))
      setShowCapsules(false)
      await load()
    } catch (err) {
      showToast({ type: 'info', title: err instanceof Error ? err.message : t('streaming.playlistDetail.addCapsuleError') })
    } finally { setAddingCapsuleId(null) }
  }

  const removeTrack = async (trackId: string, title: string) => {
    if (!confirm(t('streaming.playlistDetail.confirmRemove', { title }))) return
    try {
      const res = await fetch(`/api/dashboard/streaming/playlists/${id}/tracks/${trackId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(t('streaming.playlistDetail.removeError'))
      await load()
    } catch (err: any) {
      showToast({ type: 'info', title: err.message })
    }
  }

  // Drag and drop
  const onDragStart = (idx: number) => (e: React.DragEvent) => {
    setDraggingIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverIdx(idx)
  }
  const onDrop = (toIdx: number) => {
    if (draggingIdx === null || draggingIdx === toIdx || !playlist) {
      setDraggingIdx(null)
      setDragOverIdx(null)
      return
    }
    const entries = [...playlist.entries]
    const [moved] = entries.splice(draggingIdx, 1)
    entries.splice(toIdx, 0, moved)
    setPlaylist({ ...playlist, entries })
    setDraggingIdx(null)
    setDragOverIdx(null)
  }

  const saveOrder = async () => {
    if (!playlist) return
    setSavingOrder(true)
    try {
      const res = await fetch(`/api/dashboard/streaming/playlists/${id}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackIds: playlist.entries.map((e) => e.trackId) }),
      })
      if (!res.ok) throw new Error(t('streaming.playlistDetail.saveOrderError'))
      setLoadedTrackIds(playlist.entries.map((e) => e.trackId).join(','))
    } catch (err: any) {
      showToast({ type: 'info', title: err.message })
      await load()
    } finally {
      setSavingOrder(false)
    }
  }

  if (loading || !playlist) {
    return <div className="text-muted-foreground">{t('streaming.playlistDetail.loading')}</div>
  }

  const folderLibrary = folderFilter
    ? library.filter(t => folderFilter === '__none__' ? !t.folderId : t.folderId === folderFilter)
    : library

  const filteredLibrary = folderLibrary.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.artist || '').toLowerCase().includes(search.toLowerCase())
  )

  const inPlaylistIds = new Set(playlist.entries.map((e) => e.trackId))
  const selectableTracks = folderLibrary.filter((t) => !inPlaylistIds.has(t.id))
  const allSelected = selectableTracks.length > 0 && selectableTracks.every((t) => selectedTrackIds.has(t.id))
  const orderChanged = loadedTrackIds && loadedTrackIds !== playlist.entries.map((e) => e.trackId).join(',')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/streaming/playlists" className="text-sm text-brand hover:text-brand">
            {t('streaming.playlistDetail.back')}
          </Link>
          {!editing ? (
            <h1 className="text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
              {playlist.name}
              {playlist.isActive && (
                <span className="text-sm bg-green-600 text-white px-2 py-0.5 rounded">{t('streaming.playlistDetail.active')}</span>
              )}
            </h1>
          ) : (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-3xl font-bold bg-card text-foreground px-2 py-1 rounded border border-border mt-1"
            />
          )}
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <button onClick={startEdit} className="px-4 py-2 bg-secondary hover:bg-secondary text-foreground rounded">
              {t('streaming.playlistDetail.edit')}
            </button>
          ) : (
            <>
              <button onClick={saveEdit} disabled={savingEdit} className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded">
                {savingEdit ? t('streaming.playlistDetail.saving') : t('streaming.playlistDetail.save')}
              </button>
              <button onClick={() => { if (!savingEdit) { setEditing(false); load() } }} className="px-4 py-2 bg-secondary hover:bg-secondary text-foreground rounded disabled:opacity-50" disabled={savingEdit}>
                {t('common.cancel')}
              </button>
            </>
          )}
          {!playlist.isActive && (
            <button
              onClick={activate}
              disabled={activating}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-secondary text-white rounded"
            >
              {activating ? '...' : t('streaming.playlistDetail.activate')}
            </button>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="bg-card rounded-lg p-5 space-y-3">
        {!editing ? (
          <>
            <div className="text-muted-foreground text-sm">
              {playlist.description || <em className="text-muted-foreground">{t('streaming.playlistDetail.noDescription')}</em>}
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>🎵 {playlist.entries.length} tracks</span>
              <span>⏱️ {fmtDuration(playlist.totalDuration)}</span>
              <span>{playlist.shuffle ? t('streaming.playlistDetail.shuffleOn') : t('streaming.playlistDetail.shuffleOff')}</span>
              <span>{playlist.repeat ? t('streaming.playlistDetail.repeatOn') : t('streaming.playlistDetail.repeatOff')}</span>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={t('streaming.playlistDetail.descriptionPlaceholder')}
              className="w-full bg-background text-foreground px-3 py-2 rounded border border-border"
              rows={2}
            />
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={shuffle}
                  onChange={(e) => setShuffle(e.target.checked)}
                  className="rounded"
                />
                Shuffle
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={repeat}
                  onChange={(e) => setRepeat(e.target.checked)}
                  className="rounded"
                />
                Repeat
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Tracks en la playlist */}
      <div className="bg-card rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {t('streaming.playlistDetail.tracks', { count: playlist.entries.length })}
          </h2>
          <div className="flex gap-2">
            {orderChanged && (
              <button
                onClick={saveOrder}
                disabled={savingOrder}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white text-sm rounded"
              >
                {savingOrder ? t('streaming.playlistDetail.saving') : t('streaming.playlistDetail.saveOrder')}
              </button>
            )}
            <button
              onClick={() => {
                setShowAdd(!showAdd)
                setSelectedTrackIds(new Set())
              }}
              className="px-3 py-1.5 bg-brand hover:bg-brand text-white text-sm rounded"
            >
              {showAdd ? t('streaming.playlistDetail.close') : t('streaming.playlistDetail.addTracks')}
            </button>
          </div>
        </div>

        {/* Modal de selección múltiple */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowAdd(false); setSelectedTrackIds(new Set()) }} />
            <div className="relative bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">{t('streaming.playlistDetail.addTracksTitle')}</h3>
                <button
                  onClick={() => { setShowAdd(false); setSelectedTrackIds(new Set()) }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Folder filter */}
              {folders.length > 0 && (
                <div className="px-4 pt-3 pb-1 border-b border-border">
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <select
                      value={folderFilter ?? ''}
                      onChange={e => setFolderFilter(e.target.value || null)}
                      className="flex-1 bg-background text-foreground text-sm px-2 py-1.5 rounded border border-border outline-none"
                    >
                      <option value="">{t('streaming.playlistDetail.allFolders')}</option>
                      <option value="__none__">{t('streaming.playlistDetail.noFolder')}</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="p-4 border-b border-border">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('streaming.playlistDetail.searchPlaceholder')}
                  className="w-full bg-background text-foreground px-3 py-2 rounded border border-border"
                />
              </div>

              {/* Select all toggle */}
              <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allSelected && selectableTracks.length > 0}
                  onChange={() => toggleSelectAll(allSelected, selectableTracks.map((t) => t.id))}
                  disabled={selectableTracks.length === 0}
                  className="rounded"
                />
                <span className="text-sm text-muted-foreground">
                  {allSelected ? t('streaming.playlistDetail.deselectAll') : t('streaming.playlistDetail.selectAll', { count: selectableTracks.length })}
                </span>
              </div>

              {/* Track list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredLibrary.length === 0 ? (
                  <div className="text-muted-foreground text-sm py-8 text-center">
                    {library.length === 0 ? t('streaming.playlistDetail.libraryEmpty') : t('streaming.playlistDetail.noResults')}
                  </div>
                ) : (
                  filteredLibrary.map((track) => {
                    const inPlaylist = inPlaylistIds.has(track.id)
                    const isSelected = selectedTrackIds.has(track.id)
                    return (
                      <div
                        key={track.id}
                        className={`flex items-center gap-2 p-2 rounded ${
                          inPlaylist ? 'bg-card/50 opacity-40' : isSelected ? 'bg-indigo-900/40 border border-indigo-700' : 'bg-card/50 hover:bg-secondary'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={inPlaylist}
                          onChange={() => toggleSelectTrack(track.id)}
                          className="rounded flex-shrink-0"
                        />
                        <div className="flex-shrink-0 w-8 h-8">
                          {track.coverUrl ? (
                            <img src={track.coverUrl} alt="" className="w-8 h-8 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          ) : (
                            <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-muted-foreground text-xs">🎵</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-foreground text-sm truncate">{track.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{track.artist || t('streaming.playlistDetail.noArtist')} · {fmtDuration(track.duration)}</div>
                        </div>
                        {inPlaylist ? (
                          <span className="text-xs text-muted-foreground flex-shrink-0">{t('streaming.playlistDetail.inPlaylist')}</span>
                        ) : (
                          <button
                            onClick={() => togglePlay(track.id, track.title)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                              playingId === track.id ? 'bg-green-600 text-white' : 'bg-secondary text-muted-foreground hover:bg-secondary'
                            }`}
                            title={playingId === track.id ? t('streaming.playlistDetail.stop') : t('streaming.playlistDetail.preview')}
                          >
                            {playingId === track.id ? '⏹' : '▶'}
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border flex gap-2">
                <button
                  onClick={() => { setShowAdd(false); setSelectedTrackIds(new Set()) }}
                  className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary text-foreground rounded-lg font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={bulkAddTracks}
                  disabled={selectedTrackIds.size === 0 || addingBulk}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white rounded-lg font-medium"
                >
                  {addingBulk ? t('streaming.playlistDetail.adding') : t('streaming.playlistDetail.addSelected', { count: selectedTrackIds.size })}
                </button>
              </div>
            </div>
          </div>
        )}

        {showCapsules && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCapsules(false)} />
            <div className="relative flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-border p-4">
                <h3 className="text-lg font-semibold text-foreground">{t('streaming.playlistDetail.addCapsule')}</h3>
                <button onClick={() => setShowCapsules(false)} className="text-muted-foreground hover:text-foreground" aria-label={t('streaming.playlistDetail.close')}>×</button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {loadingCapsules ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">{t('streaming.playlistDetail.loadingCapsules')}</p>
                ) : capsules.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">{t('streaming.playlistDetail.noCapsules')}</p>
                ) : (
                  capsules.map((capsule) => (
                    <div key={capsule.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-secondary/50">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{capsule.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{capsule.category?.name || t('streaming.playlistDetail.noCategory')}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void addCapsule(capsule.id)}
                        disabled={addingCapsuleId === capsule.id}
                        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                      >
                        {addingCapsuleId === capsule.id ? t('streaming.playlistDetail.adding') : t('streaming.playlistDetail.add')}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {playlist.entries.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            {t('streaming.playlistDetail.emptyPlaylist')}
          </div>
        ) : (
          <div>
            {playlist.entries.map((entry, idx) => (
              <div
                key={entry.entryId}
                draggable
                onDragStart={onDragStart(idx)}
                onDragOver={onDragOver(idx)}
                onDrop={() => onDrop(idx)}
                onDragEnd={() => { setDraggingIdx(null); setDragOverIdx(null) }}
                className={`flex items-center gap-3 p-3 border-b border-border/50 cursor-move transition ${
                  draggingIdx === idx ? 'opacity-30' :
                  dragOverIdx === idx ? 'bg-brand/30 border-brand' :
                  'hover:bg-secondary/30'
                }`}
              >
                <span className="text-muted-foreground text-sm w-8 text-center select-none">
                  ⋮⋮ {idx + 1}
                </span>
                <div className="flex-shrink-0 w-8 h-8 mr-1">
                  {entry.coverUrl ? (
                    <img
                      src={entry.coverUrl}
                      alt=""
                      className="w-8 h-8 rounded object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-muted-foreground text-xs">🎵</div>
                  )}
                </div>
                <button
                  onClick={() => togglePlay(entry.trackId, entry.title)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                    playingId === entry.trackId
                      ? 'bg-green-600 text-white'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary'
                  }`}
                  title={playingId === entry.trackId ? t('streaming.playlistDetail.stop') : t('streaming.playlistDetail.preview')}
                >
                  {playingId === entry.trackId ? '⏹' : '▶'}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-foreground">
                    <span className="truncate">{entry.title}</span>
                    {entry.capsuleId && (
                      <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-foreground">
                        {t('streaming.playlistDetail.capsule')}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {entry.artist || t('streaming.playlistDetail.noArtist')} · {fmtDuration(entry.duration)}
                  </div>
                </div>
                <button
                  onClick={() => removeTrack(entry.trackId, entry.title)}
                  className="text-red-400 hover:text-red-300 text-sm px-2"
                >
                  {t('streaming.playlistDetail.remove')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
