'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/ui/toast'

interface VideoPlaylist {
  id: string
  name: string
  trackCount: number
  createdAt: string
}

interface VideoTrack {
  id: string
  title: string
  duration: number
  thumbnail: string | null
  folderId: string | null
}

interface PlaylistEntry {
  id: string
  playlistId: string
  trackId: string
  position: number
  title: string
  duration: number
  thumbnail: string | null
}

interface Folder {
  id: string
  name: string
  parentId: string | null
}

export default function TvPlaylistsPage() {
  const [playlists, setPlaylists] = useState<VideoPlaylist[]>([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)
  const [entries, setEntries] = useState<PlaylistEntry[]>([])
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const { toast } = useToast()

  // Agregar tracks
  const [showAdd, setShowAdd] = useState(false)
  const [tracks, setTracks] = useState<VideoTrack[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [search, setSearch] = useState('')
  const [folderFilter, setFolderFilter] = useState<string | null>(null)
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set())
  const [addingBulk, setAddingBulk] = useState(false)

  // Reordenar
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const [loadedEntryIds, setLoadedEntryIds] = useState('')
  const [savingOrder, setSavingOrder] = useState(false)

  const fetchPlaylists = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/television/playlists')
      if (res.ok) {
        const data = await res.json()
        setPlaylists(data.playlists || [])
        if (data.playlists?.length > 0) {
          setSelectedPlaylistId(prev => prev && data.playlists.some((p: any) => p.id === prev) ? prev : data.playlists[0].id)
        } else {
          setSelectedPlaylistId(null)
        }
      }
    } catch (_) {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlaylists() }, [fetchPlaylists])

  const fetchEntries = useCallback(async () => {
    if (!selectedPlaylistId) return
    try {
      setLoadingEntries(true)
      const res = await fetch(`/api/dashboard/television/playlists/${selectedPlaylistId}/entries`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
        setLoadedEntryIds((data.entries || []).map((e: any) => e.id).join(','))
      }
    } catch (_) {
    } finally {
      setLoadingEntries(false)
    }
  }, [selectedPlaylistId])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  // Cargar biblioteca y carpetas para el modal de agregar
  const loadLibrary = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set('limit', '500')
      if (search) params.set('search', search)
      if (folderFilter) params.set('folderId', folderFilter)
      const [trRes, foRes] = await Promise.all([
        fetch(`/api/dashboard/television/tracks?${params}`),
        fetch('/api/dashboard/television/folders'),
      ])
      if (trRes.ok) {
        const data = await trRes.json()
        setTracks(data.tracks || [])
      }
      if (foRes.ok) {
        const data = await foRes.json()
        setFolders(data.folders || [])
      }
    } catch (_) {}
  }, [search, folderFilter])

  useEffect(() => { if (showAdd) loadLibrary() }, [showAdd, loadLibrary])

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return
    const res = await fetch('/api/dashboard/television/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newPlaylistName.trim() }),
    })
    if (res.ok) {
      setNewPlaylistName('')
      toast({ type: 'success', title: 'Playlist creada' })
      fetchPlaylists()
    }
  }

  const deletePlaylist = async (id: string) => {
    if (!confirm('¿Eliminar esta playlist?')) return
    const res = await fetch(`/api/dashboard/television/playlists/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ type: 'success', title: 'Playlist eliminada' })
      if (selectedPlaylistId === id) setSelectedPlaylistId(null)
      fetchPlaylists()
    }
  }

  const addTrack = async (trackId: string) => {
    if (!selectedPlaylistId) return
    const res = await fetch(`/api/dashboard/television/playlists/${selectedPlaylistId}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId }),
    })
    if (res.ok) {
      fetchEntries()
      fetchPlaylists()
    }
  }

  const bulkAddTracks = async () => {
    if (!selectedPlaylistId) return
    const ids = Array.from(selectedTrackIds)
    if (ids.length === 0) return
    setAddingBulk(true)
    try {
      let added = 0
      for (const trackId of ids) {
        const res = await fetch(`/api/dashboard/television/playlists/${selectedPlaylistId}/entries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackId }),
        })
        if (res.ok) added++
      }
      toast({ type: 'success', title: `${added} tracks agregados` })
      setSelectedTrackIds(new Set())
      setShowAdd(false)
      setSearch('')
      setFolderFilter(null)
      fetchEntries()
      fetchPlaylists()
    } catch (_) {
      toast({ type: 'error', title: 'Error al agregar tracks' })
    } finally {
      setAddingBulk(false)
    }
  }

  const removeEntry = async (entryId: string) => {
    if (!selectedPlaylistId) return
    const res = await fetch(`/api/dashboard/television/playlists/${selectedPlaylistId}/entries/${entryId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      toast({ type: 'success', title: 'Track removido' })
      fetchEntries()
      fetchPlaylists()
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
    if (draggingIdx === null || draggingIdx === toIdx) {
      setDraggingIdx(null)
      setDragOverIdx(null)
      return
    }
    const next = [...entries]
    const [moved] = next.splice(draggingIdx, 1)
    next.splice(toIdx, 0, moved)
    setEntries(next)
    setDraggingIdx(null)
    setDragOverIdx(null)
  }

  const saveOrder = async () => {
    if (!selectedPlaylistId) return
    setSavingOrder(true)
    try {
      const res = await fetch(`/api/dashboard/television/playlists/${selectedPlaylistId}/entries/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds: entries.map(e => e.id) }),
      })
      if (res.ok) {
        setLoadedEntryIds(entries.map(e => e.id).join(','))
        toast({ type: 'success', title: 'Orden guardado' })
      } else {
        toast({ type: 'error', title: 'Error al guardar orden' })
        fetchEntries()
      }
    } catch (_) {
      toast({ type: 'error', title: 'Error al guardar orden' })
      fetchEntries()
    } finally {
      setSavingOrder(false)
    }
  }

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const inPlaylistIds = new Set(entries.map(e => e.trackId))
  const orderChanged = loadedEntryIds && loadedEntryIds !== entries.map(e => e.id).join(',')

  const toggleSelectTrack = (trackId: string) => {
    setSelectedTrackIds((prev) => {
      const next = new Set(prev)
      if (next.has(trackId)) next.delete(trackId)
      else next.add(trackId)
      return next
    })
  }

  const toggleSelectAll = (allSelected: boolean, ids: string[]) => {
    if (allSelected) setSelectedTrackIds(new Set())
    else setSelectedTrackIds(new Set(ids))
  }

  if (loading) return <div className="text-gray-400 p-6">Cargando...</div>

  const selectableTracks = tracks.filter(t => !inPlaylistIds.has(t.id))
  const allSelected = selectableTracks.length > 0 && selectableTracks.every((t) => selectedTrackIds.has(t.id))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Programación</h1>
        <p className="mt-1 text-sm text-gray-400">
          Creá y editá las playlists de video para tu canal de Televisión. Los videos se agregan desde la Videoteca o con el buscador.
        </p>
      </div>

      <div className="flex gap-4">
        {/* Playlist sidebar */}
        <div className="w-64 flex-shrink-0 space-y-3">
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700/40 shadow-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-300">Playlists</h3>
            {playlists.map(pl => (
              <div key={pl.id} className="flex items-center gap-1 group">
                <button
                  onClick={() => setSelectedPlaylistId(pl.id)}
                  className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedPlaylistId === pl.id ? 'bg-cyan-600/30 text-cyan-300' : 'text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  ▶ {pl.name} ({pl.trackCount})
                </button>
                <button onClick={() => deletePlaylist(pl.id)} className="hidden group-hover:block text-xs text-gray-500 hover:text-red-400">
                  ✕
                </button>
              </div>
            ))}
            <div className="flex gap-1 pt-2">
              <input
                value={newPlaylistName}
                onChange={e => setNewPlaylistName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createPlaylist()}
                placeholder="Nueva playlist..."
                className="flex-1 bg-gray-700 text-white text-xs px-2 py-1.5 rounded border border-gray-600 outline-none focus:border-cyan-500"
              />
              <button onClick={createPlaylist} className="px-2 py-1 bg-cyan-600 text-white text-xs rounded hover:bg-cyan-700">
                +
              </button>
            </div>
          </div>

          {selectedPlaylistId && (
            <button
              onClick={() => { setShowAdd(true); setSelectedTrackIds(new Set()); setSearch(''); setFolderFilter(null) }}
              className="w-full px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg transition-colors"
            >
              + Agregar tracks
            </button>
          )}
        </div>

        {/* Playlist entries */}
        <div className="flex-1">
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700/40 shadow-xl overflow-hidden">
            {!selectedPlaylistId ? (
              <div className="p-6 text-center text-gray-500">Seleccioná o creá una playlist</div>
            ) : loadingEntries ? (
              <div className="p-6 text-center text-gray-500">Cargando...</div>
            ) : (
              <>
                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">
                    {playlists.find(p => p.id === selectedPlaylistId)?.name} ({entries.length})
                  </h2>
                  {orderChanged && (
                    <button
                      onClick={saveOrder}
                      disabled={savingOrder}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white text-sm rounded"
                    >
                      {savingOrder ? 'Guardando...' : 'Guardar orden'}
                    </button>
                  )}
                </div>
                {entries.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    Playlist vacía. Agregá videos desde la Videoteca o con "+ Agregar tracks".
                  </div>
                ) : (
                  <div>
                    {entries.map((entry, idx) => (
                      <div
                        key={entry.id}
                        draggable
                        onDragStart={onDragStart(idx)}
                        onDragOver={onDragOver(idx)}
                        onDrop={() => onDrop(idx)}
                        onDragEnd={() => { setDraggingIdx(null); setDragOverIdx(null) }}
                        className={`flex items-center gap-3 p-3 border-b border-gray-700/50 cursor-move transition ${
                          draggingIdx === idx ? 'opacity-30' :
                          dragOverIdx === idx ? 'bg-cyan-900/30 border-cyan-600' :
                          'hover:bg-gray-700/30'
                        }`}
                      >
                        <span className="text-gray-500 text-sm w-8 text-center select-none">
                          ⋮⋮ {idx + 1}
                        </span>
                        <div className="flex-shrink-0 w-16 h-10">
                          {entry.thumbnail ? (
                            <img src={entry.thumbnail} alt="" className="w-16 h-10 object-cover rounded" />
                          ) : (
                            <div className="w-16 h-10 bg-gray-700 rounded flex items-center justify-center text-gray-500 text-xs">N/A</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white truncate">{entry.title}</div>
                          <div className="text-xs text-gray-500">{formatDuration(entry.duration)}</div>
                        </div>
                        <button
                          onClick={() => removeEntry(entry.id)}
                          className="text-xs text-gray-500 hover:text-red-400"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal de agregar tracks */}
      {showAdd && selectedPlaylistId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowAdd(false); setSelectedTrackIds(new Set()) }} />
          <div className="relative bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Agregar tracks</h3>
              <button onClick={() => { setShowAdd(false); setSelectedTrackIds(new Set()) }} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="px-4 pt-3 pb-1 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <select
                  value={folderFilter ?? ''}
                  onChange={e => setFolderFilter(e.target.value || null)}
                  className="flex-1 bg-gray-900 text-white text-sm px-2 py-1.5 rounded border border-gray-700 outline-none"
                >
                  <option value="">Todas las carpetas</option>
                  <option value="__none__">Sin carpeta</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 border-b border-gray-700">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Buscar en videoteca..."
                className="w-full bg-gray-900 text-white px-3 py-2 rounded border border-gray-700"
              />
            </div>

            <div className="px-4 py-2 border-b border-gray-700 flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelected && selectableTracks.length > 0}
                onChange={() => toggleSelectAll(allSelected, selectableTracks.map(t => t.id))}
                disabled={selectableTracks.length === 0}
                className="rounded"
              />
              <span className="text-sm text-gray-300">
                {allSelected ? 'Deseleccionar todos' : `Seleccionar todos (${selectableTracks.length} disponibles)`}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {selectableTracks.length === 0 ? (
                <div className="text-gray-500 text-sm py-8 text-center">
                  {tracks.length === 0 ? 'No hay videos. Subí videos primero en la Videoteca.' : 'Sin resultados.'}
                </div>
              ) : (
                selectableTracks.map(t => {
                  const isSelected = selectedTrackIds.has(t.id)
                  return (
                    <div
                      key={t.id}
                      className={`flex items-center gap-2 p-2 rounded ${
                        isSelected ? 'bg-indigo-900/40 border border-indigo-700' : 'bg-gray-800/50 hover:bg-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectTrack(t.id)}
                        className="rounded flex-shrink-0"
                      />
                      <div className="flex-shrink-0 w-12 h-8">
                        {t.thumbnail ? (
                          <img src={t.thumbnail} alt="" className="w-12 h-8 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-8 bg-gray-700 rounded" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm truncate">{t.title}</div>
                        <div className="text-xs text-gray-500">{formatDuration(t.duration)}</div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="p-4 border-t border-gray-700 flex gap-2">
              <button
                onClick={() => { setShowAdd(false); setSelectedTrackIds(new Set()) }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={bulkAddTracks}
                disabled={selectedTrackIds.size === 0 || addingBulk}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white rounded-lg font-medium"
              >
                {addingBulk ? 'Agregando...' : `Agregar seleccionados (${selectedTrackIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
