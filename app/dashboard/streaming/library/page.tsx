'use client'

import { showToast } from '@/components/ui/toast'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

import { useEffect, useState, useRef, useCallback } from 'react'
import { LibraryUploader } from '@/components/dashboard/streaming/LibraryUploader'

interface Track {
  id: string
  title: string
  artist: string | null
  album: string | null
  duration: number | null
  fileName: string
  fileSize: number
  coverUrl: string | null
  folderId: string | null
  uploadedAt: string
}

interface Folder {
  id: string
  name: string
  parentId: string | null
}

interface StorageInfo {
  totalMB: number
  quotaMB: number | null
  percentUsed: number | null
  remainingMB: number | null
  exceeded: boolean
  trackCount: number
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

function FolderIcon() {
  return (
    <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  )
}

const PAGE_SIZE = 20

function renderPageButtons(current: number, total: number, goTo: (p: number) => void) {
  if (total <= 1) return null
  const pages: (number | 'ellipsis')[] = []

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('ellipsis')
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (current < total - 2) pages.push('ellipsis')
    pages.push(total)
  }

  return pages.map((p, idx) =>
    p === 'ellipsis' ? (
      <span key={`e${idx}`} className="px-1 text-muted-foreground text-xs">...</span>
    ) : (
      <button
        key={p}
        onClick={() => goTo(p)}
        className={`px-2.5 py-1 text-xs rounded transition-colors ${
          p === current
            ? 'bg-brand text-white'
            : 'bg-secondary hover:bg-secondary text-muted-foreground'
        }`}
      >
        {p}
      </button>
    )
  )
}

export default function LibraryPage() {
  const { t: tr } = useDashboardI18n()
  const [tracks, setTracks] = useState<Track[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [moveTrackId, setMoveTrackId] = useState<string | null>(null)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null)
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editArtist, setEditArtist] = useState('')
  const [coverUploadingId, setCoverUploadingId] = useState<string | null>(null)
  const [coverDeletingId, setCoverDeletingId] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [coverTrackId, setCoverTrackId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [page, setPage] = useState(1)
  const [refreshingCovers, setRefreshingCovers] = useState(false)
  const [coverResult, setCoverResult] = useState('')
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set())
  const [bulkFolderId, setBulkFolderId] = useState('')
  const [bulkMoving, setBulkMoving] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [res, storageRes, foldersRes] = await Promise.all([
        fetch('/api/dashboard/streaming/library', { cache: 'no-store' }),
        fetch('/api/dashboard/streaming/library/storage', { cache: 'no-store' }),
        fetch('/api/dashboard/streaming/library/folders', { cache: 'no-store' }),
      ])
      if (res.ok) {
        const data = await res.json()
        const nextTracks = data.tracks || []
        setTracks(nextTracks)
        setSelectedTrackIds((prev) => {
          if (prev.size === 0) return prev
          const ids = new Set(nextTracks.map((track: Track) => track.id))
          const next = new Set(Array.from(prev).filter((id) => ids.has(id)))
          return next.size === prev.size ? prev : next
        })
      }
      if (storageRes.ok) {
        setStorage(await storageRes.json())
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
  }, [])

  useEffect(() => { load() }, [load])

  const refreshCovers = async () => {
    setRefreshingCovers(true)
    setCoverResult('')
    try {
      const res = await fetch('/api/dashboard/streaming/library/covers/refresh', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setCoverResult(
          tr('streaming.library.coversResult', { covers: data.coversFound ?? 0, titles: data.titlesFixed ?? 0, scanned: data.scanned ?? 0 })
        )
        await load()
      } else {
        setCoverResult(data.message || tr('streaming.library.coversError'))
      }
    } catch {
      setCoverResult(tr('streaming.library.coversError'))
    } finally {
      setRefreshingCovers(false)
    }
  }

  const filteredTracks = selectedFolderId
    ? tracks.filter(t => selectedFolderId === '__none__' ? !t.folderId : t.folderId === selectedFolderId)
    : tracks

  useEffect(() => { setPage(1) }, [selectedFolderId, tracks.length])

  const totalPages = Math.max(1, Math.ceil(filteredTracks.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageTracks = filteredTracks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const allPageSelected = pageTracks.length > 0 && pageTracks.every((track) => selectedTrackIds.has(track.id))

  const rootFolders = folders.filter(f => !f.parentId)
  const childFolders = (parentId: string) => folders.filter(f => f.parentId === parentId)

  const folderTrackCount = (folderId: string) => tracks.filter(t => t.folderId === folderId).length
  const currentFolderName = selectedFolderId
    ? folders.find(f => f.id === selectedFolderId)?.name || 'Carpeta'
    : null

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      await fetch('/api/dashboard/streaming/library/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim(), parentId: newFolderParentId }),
      })
      setNewFolderName('')
      setNewFolderParentId(null)
      setCreatingFolder(false)
      await load()
    } catch { /* ignore */ }
  }

  const handleRenameFolder = async () => {
    if (!renamingFolderId || !renameValue.trim()) return
    try {
      await fetch(`/api/dashboard/streaming/library/folders/${renamingFolderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue.trim() }),
      })
      setRenamingFolderId(null)
      setRenameValue('')
      await load()
    } catch { /* ignore */ }
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm(tr('streaming.library.confirmFolder'))) return
    try {
      await fetch(`/api/dashboard/streaming/library/folders/${folderId}`, { method: 'DELETE' })
      if (selectedFolderId === folderId) setSelectedFolderId(null)
      await load()
    } catch { /* ignore */ }
  }

  useEffect(() => {
    setSelectedTrackIds(new Set())
  }, [selectedFolderId])

  const handleBulkMove = async () => {
    if (!selectedTrackIds.size || !bulkFolderId) return
    setBulkMoving(true)
    try {
      const res = await fetch('/api/dashboard/streaming/library/folders/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move',
          trackIds: Array.from(selectedTrackIds),
          folderId: bulkFolderId === '__none__' ? null : bulkFolderId,
        }),
      })
      if (!res.ok) throw new Error(tr('streaming.library.moveFailed'))
      setSelectedTrackIds(new Set())
      setBulkFolderId('')
      await load()
      showToast({ type: 'success', title: tr('streaming.library.tracksMoved') })
    } catch (err) {
      showToast({ type: 'error', title: err instanceof Error ? err.message : tr('streaming.library.moveFailed') })
    } finally {
      setBulkMoving(false)
    }
  }

  const handleBulkDelete = async () => {
    if (!selectedTrackIds.size) return
    if (!confirm(tr('streaming.library.confirmTracks', { count: selectedTrackIds.size }))) return
    setBulkDeleting(true)
    try {
      const results = await Promise.allSettled(
        Array.from(selectedTrackIds).map((id) =>
          fetch(`/api/dashboard/streaming/library/${id}`, { method: 'DELETE' }).then((res) => {
            if (!res.ok) throw new Error('delete_failed')
          })
        )
      )
      const failed = results.filter((result) => result.status === 'rejected').length
      setSelectedTrackIds(new Set())
      await load()
      if (failed) showToast({ type: 'error', title: tr('streaming.library.bulkDeleteFailed', { count: failed }) })
      else showToast({ type: 'success', title: tr('streaming.library.tracksDeleted') })
    } finally {
      setBulkDeleting(false)
    }
  }

  const toggleTrackSelected = (trackId: string) => {
    setSelectedTrackIds((prev) => {
      const next = new Set(prev)
      if (next.has(trackId)) next.delete(trackId)
      else next.add(trackId)
      return next
    })
  }

  const selectAllFiltered = () => {
    setSelectedTrackIds(new Set(filteredTracks.map((track) => track.id)))
  }

  const handleMoveTrack = async (trackId: string, folderId: string | null) => {
    try {
      await fetch('/api/dashboard/streaming/library/folders/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', trackIds: [trackId], folderId }),
      })
      setMoveTrackId(null)
      await load()
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(tr('streaming.library.confirmTrack', { name }))) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/dashboard/streaming/library/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(tr('streaming.library.errorDelete'))
      await load()
    } catch (err: any) {
      showToast({ type: 'info', title: err.message })
    } finally {
      setDeletingId(null)
    }
  }

  const startEdit = (t: Track) => {
    setEditingId(t.id)
    setEditTitle(t.title)
    setEditArtist(t.artist || '')
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/dashboard/streaming/library/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, artist: editArtist || null }),
      })
      if (!res.ok) throw new Error(tr('streaming.library.errorSave'))
      setEditingId(null)
      await load()
    } catch (err: any) {
      showToast({ type: 'info', title: err.message })
    } finally {
      setSavingEdit(false)
    }
  }

  const handleCoverUpload = async (trackId: string, file: File) => {
    setCoverUploadingId(trackId)
    try {
      const form = new FormData()
      form.append('cover', file)
      const res = await fetch(`/api/dashboard/streaming/library/${trackId}/cover`, {
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
      setCoverTrackId(null)
    }
  }

  const handleCoverDelete = async (trackId: string) => {
    if (!confirm(tr('streaming.library.confirmCover'))) return
    setCoverDeletingId(trackId)
    try {
      const res = await fetch(`/api/dashboard/streaming/library/${trackId}/cover`, { method: 'DELETE' })
      if (!res.ok) throw new Error(tr('streaming.library.errorCover'))
      await load()
    } catch (err: any) {
      showToast({ type: 'info', title: err.message })
    } finally {
      setCoverDeletingId(null)
    }
  }

  const togglePlay = (id: string, trackTitle: string) => {
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
        showToast({ type: 'error', title: `Error al reproducir "${trackTitle}"` })
      }
      audio.play().catch(() => {
        setPlayingId(null)
        showToast({ type: 'error', title: `Error al reproducir "${trackTitle}"` })
      })
      audioRef.current = audio
      setPlayingId(id)
    }
  }

  function renderFolderItem(f: Folder, depth = 0) {
    const children = childFolders(f.id)
    const count = folderTrackCount(f.id)
    return (
      <div key={f.id}>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer text-sm transition-colors group ${
            selectedFolderId === f.id
              ? 'bg-brand/20 text-brand'
              : 'text-muted-foreground hover:bg-secondary/50'
          }`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => setSelectedFolderId(f.id)}
        >
          <FolderIcon />
          {renamingFolderId === f.id ? (
            <input
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={handleRenameFolder}
              onKeyDown={e => { if (e.key === 'Enter') handleRenameFolder(); if (e.key === 'Escape') setRenamingFolderId(null) }}
              className="flex-1 bg-background text-foreground px-1 py-0.5 rounded text-sm outline-none"
              autoFocus
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 truncate">{f.name}</span>
          )}
          <span className="text-[11px] text-muted-foreground">{count}</span>
          <div className="hidden group-hover:flex items-center gap-0.5">
            <button
              onClick={e => { e.stopPropagation(); setRenamingFolderId(f.id); setRenameValue(f.name) }}
              className="p-1 text-muted-foreground hover:text-brand"
              title="Renombrar"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={e => { e.stopPropagation(); handleDeleteFolder(f.id) }}
              className="p-1 text-muted-foreground hover:text-red-400"
              title="Eliminar"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        {children.map(child => renderFolderItem(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{tr('streaming.library.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tr('streaming.library.subtitle')}
          </p>
        </div>
      </div>

      {storage && (
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/40 shadow-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-sm font-semibold text-muted-foreground">{tr('streaming.library.storage')}</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {storage.quotaMB ? tr('streaming.library.quota', { used: storage.totalMB.toFixed(1), quota: storage.quotaMB }) : tr('streaming.library.used', { used: storage.totalMB.toFixed(1) })}
            </span>
          </div>
          {storage.quotaMB && storage.percentUsed !== null ? (
            <>
              <div className="w-full h-3 bg-background rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    storage.exceeded ? 'bg-red-500' : storage.percentUsed > 80 ? 'bg-amber-500' : 'bg-brand'
                  }`}
                  style={{ width: `${Math.min(storage.percentUsed, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className={storage.exceeded ? 'text-red-400' : 'text-muted-foreground'}>
                  {tr('streaming.library.percent', { percent: storage.percentUsed.toFixed(1) })}
                </span>
                <span className="text-muted-foreground">
                  {storage.remainingMB !== null ? tr('streaming.library.free', { free: storage.remainingMB.toFixed(1) }) : '—'}
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              {tr('streaming.library.noLimit')}
            </div>
          )}
        </div>
      )}

      <LibraryUploader onUploaded={load} />

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={refreshCovers}
          disabled={refreshingCovers}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-secondary text-white text-sm font-medium rounded-lg transition-colors"
        >
          {refreshingCovers ? tr('streaming.library.searchingCovers') : tr('streaming.library.searchCovers')}
        </button>
        {coverResult && (
          <span className="text-xs text-muted-foreground">{coverResult}</span>
        )}
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 shrink-0">
          <div className="bg-card rounded-lg shadow-lg">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tr('streaming.library.folders')}</span>
              <button
                onClick={() => { setCreatingFolder(true); setNewFolderParentId(null); setNewFolderName('') }}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                title={tr('streaming.library.newFolder')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {creatingFolder && (
              <div className="p-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <FolderIcon />
                  <input
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName('') } }}
                    placeholder={tr('streaming.library.namePlaceholder')}
                    className="flex-1 bg-background text-foreground px-2 py-1 rounded text-sm outline-none"
                    autoFocus
                  />
                  <button onClick={handleCreateFolder} className="text-green-400 text-xs font-medium">OK</button>
                  <button onClick={() => { setCreatingFolder(false); setNewFolderName('') }} className="text-muted-foreground text-xs">✕</button>
                </div>
              </div>
            )}

            <div className="p-2 space-y-0.5 max-h-[500px] overflow-y-auto">
              {/* Todos */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer text-sm transition-colors ${
                  selectedFolderId === null
                    ? 'bg-secondary/60 text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/50'
                }`}
                onClick={() => setSelectedFolderId(null)}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span className="flex-1">{tr('streaming.library.all')}</span>
                <span className="text-[11px] text-muted-foreground">{tracks.length}</span>
              </div>

              {/* Sin carpeta */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer text-sm transition-colors ${
                  selectedFolderId === '__none__'
                    ? 'bg-secondary/60 text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/50'
                }`}
                onClick={() => setSelectedFolderId('__none__')}
              >
                <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span className="flex-1">{tr('streaming.library.uncategorized')}</span>
                <span className="text-[11px] text-muted-foreground">{tracks.filter(t => !t.folderId).length}</span>
              </div>

              {rootFolders.length > 0 && <div className="border-t border-border/50 my-1.5" />}

              {rootFolders.map(f => renderFolderItem(f))}
            </div>

            {/* Crear subcarpeta dentro de carpeta seleccionada */}
            {selectedFolderId && selectedFolderId !== '__none__' && (
              <div className="p-2 border-t border-border">
                <button
                  onClick={() => { setCreatingFolder(true); setNewFolderParentId(selectedFolderId); setNewFolderName('') }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full px-2 py-1"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {tr('streaming.library.subfolder')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="bg-card rounded-lg shadow-lg overflow-x-auto">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                {currentFolderName && (
                  <>
                    <FolderIcon />
                    <span>{currentFolderName}</span>
                    <span className="text-muted-foreground font-normal">·</span>
                  </>
                )}
                {loading ? tr('streaming.library.loading') : tr('streaming.library.trackCount', { count: filteredTracks.length })}
              </h2>
              <a href="/dashboard/streaming" className="text-sm text-brand hover:text-brand">
                {tr('streaming.library.back')}
              </a>
            </div>

            {selectedTrackIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-b border-border bg-brand/5 px-4 py-2.5">
                <span className="text-xs font-medium text-foreground">
                  {tr('streaming.library.selectedCount', { count: selectedTrackIds.size })}
                </span>
                {selectedTrackIds.size < filteredTracks.length && (
                  <button type="button" onClick={selectAllFiltered} className="text-[11px] text-brand hover:underline">
                    {tr('streaming.library.selectAll', { count: filteredTracks.length })}
                  </button>
                )}
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <select
                    value={bulkFolderId}
                    onChange={(e) => setBulkFolderId(e.target.value)}
                    className="rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] text-foreground"
                  >
                    <option value="">{tr('streaming.library.moveTo')}</option>
                    <option value="__none__">{tr('streaming.library.uncategorized')}</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>{folder.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleBulkMove()}
                    disabled={!bulkFolderId || bulkMoving}
                    className="rounded-lg bg-brand px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-40"
                  >
                    {bulkMoving ? tr('streaming.library.moving') : tr('streaming.library.move')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleBulkDelete()}
                    disabled={bulkDeleting}
                    className="rounded-lg border border-red-500/40 px-3 py-1.5 text-[11px] font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                  >
                    {bulkDeleting ? tr('streaming.library.deleting') : tr('streaming.library.delete')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTrackIds(new Set())}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {tr('streaming.library.removeSelection')}
                  </button>
                </div>
              </div>
            )}

            {filteredTracks.length === 0 && !loading ? (
              <div className="p-12 text-center text-muted-foreground">
                {selectedFolderId ? tr('streaming.library.emptyFolder') : tr('streaming.library.emptyLibrary')}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-background/50 text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="w-10 p-3">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={() => {
                          if (allPageSelected) {
                            setSelectedTrackIds((prev) => {
                              const next = new Set(prev)
                              for (const track of pageTracks) next.delete(track.id)
                              return next
                            })
                          } else {
                            setSelectedTrackIds((prev) => {
                              const next = new Set(prev)
                              for (const track of pageTracks) next.add(track.id)
                              return next
                            })
                          }
                        }}
                        className="h-4 w-4 accent-[var(--brand-500)]"
                        aria-label={tr('streaming.library.selectAllPage')}
                      />
                    </th>
                    <th className="text-left p-3 w-10">🎵</th>
                    <th className="text-left p-3 w-12">{tr('streaming.library.cover')}</th>
                    <th className="text-left p-3">{tr('streaming.library.titleCol')}</th>
                    <th className="text-left p-3 hidden sm:table-cell">{tr('streaming.library.artistCol')}</th>
                    <th className="text-left p-3">{tr('streaming.library.duration')}</th>
                    <th className="text-left p-3 hidden md:table-cell">{tr('streaming.library.size')}</th>
                    <th className="text-right p-3">{tr('streaming.library.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageTracks.map((t) => (
                    <tr key={t.id} className="border-t border-border/50 hover:bg-secondary/20">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedTrackIds.has(t.id)}
                          onChange={() => toggleTrackSelected(t.id)}
                          className="h-4 w-4 accent-[var(--brand-500)]"
                          aria-label={tr('streaming.library.selectTrack', { title: t.title })}
                        />
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => togglePlay(t.id, t.title)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                            playingId === t.id
                              ? 'bg-green-600 text-white'
                              : 'bg-secondary text-muted-foreground hover:bg-secondary'
                          }`}
                          title={playingId === t.id ? tr('streaming.library.stop') : tr('streaming.library.preview')}
                        >
                          {playingId === t.id ? '⏹' : '▶'}
                        </button>
                      </td>
                      <td className="p-3">
                        {editingId === t.id ? (
                          <div className="relative">
                            <img
                              src={t.coverUrl || ''}
                              alt=""
                              className={`w-10 h-10 rounded object-cover shadow-sm ${!t.coverUrl ? 'hidden' : ''}`}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                            {!t.coverUrl && (
                              <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center text-muted-foreground text-lg">🎵</div>
                            )}
                            <input
                              ref={coverInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => { const file = e.target.files?.[0]; if (file) handleCoverUpload(t.id, file) }}
                            />
                            <button
                              onClick={() => { setCoverTrackId(t.id); coverInputRef.current?.click() }}
                              disabled={coverUploadingId === t.id || coverDeletingId === t.id}
                              className="absolute -bottom-1 -right-1 w-5 h-5 bg-brand rounded-full flex items-center justify-center text-white text-xs hover:bg-brand disabled:opacity-50"
                              title={tr('streaming.library.uploadCover')}
                            >
                              {coverUploadingId === t.id ? '⏳' : '📷'}
                            </button>
                            {t.coverUrl && (
                              <button
                                onClick={() => handleCoverDelete(t.id)}
                                disabled={coverDeletingId === t.id}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-white text-[8px] hover:bg-red-500 disabled:opacity-50"
                                title={tr('streaming.library.deleteCover')}
                              >
                                {coverDeletingId === t.id ? '⏳' : '✕'}
                              </button>
                            )}
                          </div>
                        ) : (
                          t.coverUrl ? (
                            <img src={t.coverUrl} alt="" className="w-10 h-10 rounded object-cover shadow-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          ) : (
                            <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center text-muted-foreground text-lg">🎵</div>
                          )
                        )}
                      </td>
                      <td className="p-3 text-foreground">
                        {editingId === t.id ? (
                          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="bg-background text-foreground px-2 py-1 rounded w-full" />
                        ) : (
                          t.title
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground hidden sm:table-cell">
                        {editingId === t.id ? (
                          <input value={editArtist} onChange={(e) => setEditArtist(e.target.value)} placeholder={tr('streaming.library.noArtist')} className="bg-background text-foreground px-2 py-1 rounded w-full" />
                        ) : (
                          t.artist || <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{fmtDuration(t.duration)}</td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">{fmtSize(t.fileSize)}</td>
                      <td className="p-3 text-right">
                        {editingId === t.id ? (
                          <>
                            <button onClick={saveEdit} disabled={savingEdit} className="text-green-400 hover:text-green-300 disabled:text-green-700 mr-3 text-xs">
                              {savingEdit ? tr('streaming.library.saving') : tr('streaming.library.save')}
                            </button>
                            <button onClick={() => { if (!savingEdit) { setEditingId(null); setCoverTrackId(null) } }} className="text-muted-foreground hover:text-muted-foreground text-xs disabled:opacity-50" disabled={savingEdit}>
                              {tr('streaming.library.cancel')}
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(t)} className="text-brand hover:text-brand mr-2 text-xs">{tr('streaming.library.edit')}</button>
                            <button
                              onClick={() => setMoveTrackId(moveTrackId === t.id ? null : t.id)}
                              className="text-amber-400 hover:text-amber-300 mr-2 text-xs"
                              title={tr('streaming.library.moveToFolder')}
                            >
                              {tr('streaming.library.move')}
                            </button>
                            {moveTrackId === t.id && (
                              <div className="absolute mt-1 right-0 z-10 bg-card border border-border rounded-lg shadow-xl p-2 min-w-[180px]">
                                <div className="text-[11px] text-muted-foreground uppercase px-2 py-1">{tr('streaming.library.moveTo')}</div>
                                <button onClick={() => handleMoveTrack(t.id, null)} className="block w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:bg-secondary rounded">{tr('streaming.library.uncategorized')}</button>
                                {folders.map(f => (
                                  <button key={f.id} onClick={() => handleMoveTrack(t.id, f.id)} className="block w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:bg-secondary rounded flex items-center gap-1.5">
                                    <FolderIcon /> {f.name}
                                  </button>
                                ))}
                              </div>
                            )}
                            <button
                              onClick={() => handleDelete(t.id, t.title)}
                              disabled={deletingId === t.id}
                              className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50"
                            >
                              {deletingId === t.id ? tr('streaming.library.deletingTrack') : tr('streaming.library.delete')}
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

          {filteredTracks.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 text-xs bg-secondary hover:bg-secondary disabled:bg-card disabled:text-muted-foreground text-foreground rounded transition-colors"
              >
                {tr('streaming.library.previous')}
              </button>
              <div className="flex items-center gap-1">
                {renderPageButtons(currentPage, totalPages, (p) => setPage(p))}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 text-xs bg-secondary hover:bg-secondary disabled:bg-card disabled:text-muted-foreground text-foreground rounded transition-colors"
              >
                {tr('streaming.library.next')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
