'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/ui/toast'
import { MediaUploader } from '@/components/dashboard/streaming/MediaUploader'

interface VideoTrack {
  id: string
  title: string
  filename: string
  filepath: string
  filesize: number
  duration: number
  thumbnail: string | null
  width: number | null
  height: number | null
  codec: string | null
  status: string | null
  processingError: string | null
  folderId: string | null
  createdAt: string
}

interface Folder {
  id: string
  name: string
  parentId: string | null
  trackCount?: number
  _count?: { videoTracks: number }
}

interface StorageInfo {
  totalBytes: number
  totalMB: number
  trackCount: number
  quotaMB: number | null
  percentUsed: number | null
  remainingMB: number | null
}

interface VideoPlaylist {
  id: string
  name: string
  trackCount: number
}

export default function TvLibraryPage() {
  const [tracks, setTracks] = useState<VideoTrack[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [playlists, setPlaylists] = useState<VideoPlaylist[]>([])
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set())
  const [newFolderName, setNewFolderName] = useState('')
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renamingName, setRenamingName] = useState('')
  const [search, setSearch] = useState('')
  const { toast } = useToast()

  const fetchAll = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (currentFolderId) params.set('folderId', currentFolderId)
      if (search) params.set('search', search)
      params.set('limit', '200')

      const [tracksRes, foldersRes, storageRes, playlistsRes] = await Promise.all([
        fetch(`/api/dashboard/television/tracks?${params}`),
        fetch('/api/dashboard/television/folders'),
        fetch('/api/dashboard/television/storage'),
        fetch('/api/dashboard/television/playlists'),
      ])

      if (tracksRes.ok) {
        const data = await tracksRes.json()
        setTracks(data.tracks || [])
      }
      if (foldersRes.ok) {
        const data = await foldersRes.json()
        setFolders(data.folders || [])
      }
      if (storageRes.ok) {
        setStorage(await storageRes.json())
      }
      if (playlistsRes.ok) {
        const data = await playlistsRes.json()
        setPlaylists(data.playlists || [])
      }
    } catch (err) {
      console.error('[tv-library] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [currentFolderId, search])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Folder tree building
  const rootFolders = folders.filter(f => !f.parentId)
  const childFolders = (parentId: string) => folders.filter(f => f.parentId === parentId)

  const getTrackCount = (f: Folder) => f.trackCount ?? f._count?.videoTracks ?? 0

  // Folder CRUD
  const createFolder = async () => {
    if (!newFolderName.trim()) return
    const res = await fetch('/api/dashboard/television/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName.trim(), parentId: currentFolderId }),
    })
    if (res.ok) {
      setNewFolderName('')
      toast({ type: 'success', title: 'Carpeta creada' })
      fetchAll()
    }
  }

  const renameFolder = async (folderId: string) => {
    if (!renamingName.trim()) return
    const res = await fetch(`/api/dashboard/television/folders/${folderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renamingName.trim() }),
    })
    if (res.ok) {
      setRenamingFolderId(null)
      toast({ type: 'success', title: 'Carpeta renombrada' })
      fetchAll()
    }
  }

  const deleteFolder = async (folderId: string) => {
    if (!confirm('¿Eliminar carpeta? Los videos se moverán a raíz.')) return
    const res = await fetch(`/api/dashboard/television/folders/${folderId}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ type: 'success', title: 'Carpeta eliminada' })
      if (currentFolderId === folderId) setCurrentFolderId(null)
      fetchAll()
    }
  }

  const deleteTrack = async (trackId: string) => {
    if (!confirm('¿Eliminar este video?')) return
    const res = await fetch(`/api/dashboard/television/tracks/${trackId}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ type: 'success', title: 'Video eliminado' })
      fetchAll()
    }
  }

  const batchMove = async (folderId: string | null) => {
    if (selectedTracks.size === 0) return
    const res = await fetch('/api/dashboard/television/tracks/batch-move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackIds: Array.from(selectedTracks), folderId }),
    })
    if (res.ok) {
      toast({ type: 'success', title: `${selectedTracks.size} videos movidos` })
      setSelectedTracks(new Set())
      fetchAll()
    }
  }

  const addToPlaylist = async (playlistId: string) => {
    if (selectedTracks.size === 0 || !playlistId) return
    const ids = Array.from(selectedTracks)
    let added = 0
    for (const trackId of ids) {
      const res = await fetch(`/api/dashboard/television/playlists/${playlistId}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId }),
      })
      if (res.ok) added++
    }
    toast({ type: 'success', title: `${added} videos agregados a la playlist` })
    setSelectedTracks(new Set())
    fetchAll()
  }

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Videoteca</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sube y gestiona tus videos para Televisión
        </p>
      </div>

      {/* Storage bar */}
      {storage && (
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/40 shadow-xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              {storage.trackCount} videos — {storage.totalMB.toFixed(1)} MB
            </span>
            {storage.quotaMB && (
              <span className={storage.percentUsed && storage.percentUsed > 90 ? 'text-red-400' : 'text-muted-foreground'}>
                {storage.percentUsed?.toFixed(0)}% usado ({storage.remainingMB?.toFixed(0)} MB libres)
              </span>
            )}
          </div>
          {storage.quotaMB && storage.quotaMB > 0 && (
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  storage.percentUsed && storage.percentUsed > 90 ? 'bg-red-500' : 'bg-brand'
                }`}
                style={{ width: `${Math.min(100, storage.percentUsed || 0)}%` }}
              />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-4">
        {/* Folder sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/40 shadow-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Carpetas</h3>
            <button
              onClick={() => setCurrentFolderId(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                !currentFolderId ? 'bg-brand/30 text-brand' : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              📁 Todas ({tracks.length})
            </button>
            {rootFolders.map(folder => (
              <div key={folder.id}>
                <div className="flex items-center gap-1 group">
                  <button
                    onClick={() => setCurrentFolderId(folder.id)}
                    className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      currentFolderId === folder.id ? 'bg-brand/30 text-brand' : 'text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    📁 {folder.name} ({getTrackCount(folder)})
                  </button>
                  {renamingFolderId === folder.id ? (
                    <div className="flex gap-1">
                      <input
                        value={renamingName}
                        onChange={e => setRenamingName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && renameFolder(folder.id)}
                        className="w-24 bg-secondary text-foreground text-xs px-2 py-1 rounded"
                        autoFocus
                      />
                      <button onClick={() => renameFolder(folder.id)} className="text-xs text-green-400">✓</button>
                      <button onClick={() => setRenamingFolderId(null)} className="text-xs text-muted-foreground">✗</button>
                    </div>
                  ) : (
                    <div className="hidden group-hover:flex gap-1">
                      <button
                        onClick={() => { setRenamingFolderId(folder.id); setRenamingName(folder.name) }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        ✎
                      </button>
                      <button onClick={() => deleteFolder(folder.id)} className="text-xs text-muted-foreground hover:text-red-400">
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* New folder */}
            <div className="flex gap-1">
              <input
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createFolder()}
                placeholder="Nueva carpeta..."
                className="flex-1 bg-secondary text-foreground text-xs px-2 py-1.5 rounded border border-border outline-none focus:border-brand"
              />
              <button onClick={createFolder} className="px-2 py-1 bg-brand text-white text-xs rounded hover:bg-brand">
                +
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-4">
          {/* Upload + search */}
          <div className="space-y-3">
            <MediaUploader
              accept="video/*"
              endpoint="/api/dashboard/television/tracks/upload"
              dropTitle="Arrastra videos aquí o haz clic para seleccionar"
              hint="Los videos se normalizan en segundo plano al subir."
              extraFields={() => (currentFolderId ? { folderId: currentFolderId } : {})}
              statusUrl={(trackId) => `/api/dashboard/television/tracks/${trackId}/status`}
              onUploaded={fetchAll}
            />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-card text-foreground px-3 py-2 rounded-lg border border-border text-sm outline-none focus:border-brand"
            />
          </div>

          {/* Batch actions */}
          {selectedTracks.size > 0 && (
            <div className="bg-card rounded-lg p-3 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">{selectedTracks.size} seleccionados</span>
              <button onClick={() => setSelectedTracks(new Set())} className="text-xs text-muted-foreground hover:text-foreground">
                Deseleccionar
              </button>
              <select
                onChange={e => batchMove(e.target.value || null)}
                className="ml-auto bg-secondary text-foreground text-xs px-2 py-1 rounded"
              >
                <option value="">Mover a...</option>
                <option value="">Raíz</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              {playlists.length > 0 && (
                <select
                  defaultValue=""
                  onChange={e => {
                    if (e.target.value) {
                      addToPlaylist(e.target.value)
                      e.target.value = ''
                    }
                  }}
                  className="bg-secondary text-foreground text-xs px-2 py-1 rounded"
                >
                  <option value="">Agregar a playlist...</option>
                  {playlists.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Tracks table */}
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/40 shadow-xl overflow-hidden">
            {loading ? (
              <div className="p-6 text-center text-muted-foreground">Cargando...</div>
            ) : tracks.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No hay videos. Sube tu primer video.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase">
                    <th className="text-left p-3 w-8">
                      <input
                        type="checkbox"
                        onChange={e => {
                          if (e.target.checked) setSelectedTracks(new Set(tracks.map(t => t.id)))
                          else setSelectedTracks(new Set())
                        }}
                        checked={selectedTracks.size === tracks.length && tracks.length > 0}
                      />
                    </th>
                    <th className="text-left p-3">Thumbnail</th>
                    <th className="text-left p-3">Título</th>
                    <th className="text-left p-3">Duración</th>
                    <th className="text-left p-3">Resolución</th>
                    <th className="text-left p-3">Tamaño</th>
                    <th className="text-right p-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tracks.map(track => (
                    <tr key={track.id} className="border-b border-border/50 hover:bg-secondary/30 text-sm">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedTracks.has(track.id)}
                          onChange={e => {
                            const next = new Set(selectedTracks)
                            e.target.checked ? next.add(track.id) : next.delete(track.id)
                            setSelectedTracks(next)
                          }}
                        />
                      </td>
                      <td className="p-3">
                        {track.thumbnail ? (
                          <img src={track.thumbnail} alt="" className="w-16 h-10 object-cover rounded" />
                        ) : (
                          <div className="w-16 h-10 bg-secondary rounded flex items-center justify-center text-muted-foreground text-xs">N/A</div>
                        )}
                      </td>
                      <td className="p-3 text-foreground font-medium">
                        {track.title}
                        {track.status === 'processing' && (
                          <span className="ml-2 text-xs text-brand">procesando…</span>
                        )}
                        {track.status === 'pending' && (
                          <span className="ml-2 text-xs text-muted-foreground">en cola</span>
                        )}
                        {track.status === 'error' && (
                          <span className="ml-2 text-xs text-red-400" title={track.processingError || ''}>error</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">{formatDuration(track.duration)}</td>
                      <td className="p-3 text-muted-foreground">
                        {track.width && track.height ? `${track.width}x${track.height}` : '-'}
                      </td>
                      <td className="p-3 text-muted-foreground">{formatSize(Number(track.filesize))}</td>
                      <td className="p-3 text-right">
                        <button onClick={() => deleteTrack(track.id)} className="text-muted-foreground hover:text-red-400 text-xs">
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
