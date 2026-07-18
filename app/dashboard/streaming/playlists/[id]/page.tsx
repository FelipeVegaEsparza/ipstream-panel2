'use client'

// =====================================================
// Page — /dashboard/streaming/playlists/[id]
// =====================================================
// Editor: agregar tracks desde la biblioteca, drag&drop para reordenar.

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Track {
  id: string
  title: string
  artist: string | null
  duration: number | null
  fileName: string
  coverUrl: string | null
}

interface Entry {
  entryId: string
  order: number
  trackId: string
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
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [library, setLibrary] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
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
        alert(`Error al reproducir "${title}"`)
      }
      audio.play().catch(() => {
        setPlayingId(null)
        alert(`Error al reproducir "${title}"`)
      })
      audioRef.current = audio
      setPlayingId(id)
    }
  }

  const load = async () => {
    try {
      setLoading(true)
      const [plRes, libRes] = await Promise.all([
        fetch(`/api/dashboard/streaming/playlists/${id}`, { cache: 'no-store' }),
        fetch('/api/dashboard/streaming/library', { cache: 'no-store' }),
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
      if (!res.ok) throw new Error('Error guardando')
      setEditing(false)
      await load()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  const activate = async () => {
    setActivating(true)
    try {
      const res = await fetch(`/api/dashboard/streaming/playlists/${id}/activate`, { method: 'POST' })
      if (!res.ok) throw new Error('Error activando')
      await load()
    } catch (err: any) {
      alert(err.message)
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
        throw new Error(data?.message || 'Error agregando')
      }
      setShowAdd(false)
      setSearch('')
      await load()
    } catch (err: any) {
      alert(err.message)
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
        throw new Error(data?.message || 'Error agregando tracks')
      }
      setShowAdd(false)
      setSearch('')
      setSelectedTrackIds(new Set())
      await load()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setAddingBulk(false)
    }
  }

  const removeTrack = async (trackId: string, title: string) => {
    if (!confirm(`¿Quitar "${title}" de la playlist?`)) return
    try {
      const res = await fetch(`/api/dashboard/streaming/playlists/${id}/tracks/${trackId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error quitando')
      await load()
    } catch (err: any) {
      alert(err.message)
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
      if (!res.ok) throw new Error('Error guardando orden')
      setLoadedTrackIds(playlist.entries.map((e) => e.trackId).join(','))
    } catch (err: any) {
      alert(err.message)
      await load()
    } finally {
      setSavingOrder(false)
    }
  }

  if (loading || !playlist) {
    return <div className="text-gray-400">Cargando...</div>
  }

  const filteredLibrary = library.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.artist || '').toLowerCase().includes(search.toLowerCase())
  )

  const inPlaylistIds = new Set(playlist.entries.map((e) => e.trackId))
  const selectableTracks = library.filter((t) => !inPlaylistIds.has(t.id))
  const allSelected = selectableTracks.length > 0 && selectableTracks.every((t) => selectedTrackIds.has(t.id))
  const orderChanged = loadedTrackIds && loadedTrackIds !== playlist.entries.map((e) => e.trackId).join(',')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/streaming/playlists" className="text-sm text-cyan-400 hover:text-cyan-300">
            ← Playlists
          </Link>
          {!editing ? (
            <h1 className="text-3xl font-bold text-white mt-1 flex items-center gap-2">
              {playlist.name}
              {playlist.isActive && (
                <span className="text-sm bg-green-600 text-white px-2 py-0.5 rounded">ACTIVA</span>
              )}
            </h1>
          ) : (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-3xl font-bold bg-gray-800 text-white px-2 py-1 rounded border border-gray-700 mt-1"
            />
          )}
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <button onClick={startEdit} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">
              ✏️ Editar
            </button>
          ) : (
            <>
              <button onClick={saveEdit} disabled={savingEdit} className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded">
                {savingEdit ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => { if (!savingEdit) { setEditing(false); load() } }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50" disabled={savingEdit}>
                Cancelar
              </button>
            </>
          )}
          {!playlist.isActive && (
            <button
              onClick={activate}
              disabled={activating}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded"
            >
              {activating ? '...' : 'Activar'}
            </button>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="bg-gray-800 rounded-lg p-5 space-y-3">
        {!editing ? (
          <>
            <div className="text-gray-400 text-sm">
              {playlist.description || <em className="text-gray-500">Sin descripción</em>}
            </div>
            <div className="flex gap-4 text-sm text-gray-400">
              <span>🎵 {playlist.entries.length} tracks</span>
              <span>⏱️ {fmtDuration(playlist.totalDuration)}</span>
              <span>{playlist.shuffle ? '🔀 Shuffle ON' : '— Shuffle off'}</span>
              <span>{playlist.repeat ? '🔁 Repeat ON' : '— Repeat off'}</span>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Descripción"
              className="w-full bg-gray-900 text-white px-3 py-2 rounded border border-gray-700"
              rows={2}
            />
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-white">
                <input
                  type="checkbox"
                  checked={shuffle}
                  onChange={(e) => setShuffle(e.target.checked)}
                  className="rounded"
                />
                Shuffle
              </label>
              <label className="flex items-center gap-2 text-sm text-white">
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
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Tracks ({playlist.entries.length})
          </h2>
          <div className="flex gap-2">
            {orderChanged && (
              <button
                onClick={saveOrder}
                disabled={savingOrder}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white text-sm rounded"
              >
                {savingOrder ? 'Guardando...' : 'Guardar orden'}
              </button>
            )}
            <button
              onClick={() => {
                setShowAdd(!showAdd)
                setSelectedTrackIds(new Set())
              }}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded"
            >
              {showAdd ? 'Cerrar' : '+ Agregar tracks'}
            </button>
          </div>
        </div>

        {/* Modal de selección múltiple */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowAdd(false); setSelectedTrackIds(new Set()) }} />
            <div className="relative bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-lg max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">Agregar tracks</h3>
                <button
                  onClick={() => { setShowAdd(false); setSelectedTrackIds(new Set()) }}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-gray-700">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="🔍 Buscar en biblioteca..."
                  className="w-full bg-gray-900 text-white px-3 py-2 rounded border border-gray-700"
                />
              </div>

              {/* Select all toggle */}
              <div className="px-4 py-2 border-b border-gray-700 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allSelected && selectableTracks.length > 0}
                  onChange={() => toggleSelectAll(allSelected, selectableTracks.map((t) => t.id))}
                  disabled={selectableTracks.length === 0}
                  className="rounded"
                />
                <span className="text-sm text-gray-300">
                  {allSelected ? 'Deseleccionar todos' : `Seleccionar todos (${selectableTracks.length} disponibles)`}
                </span>
              </div>

              {/* Track list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredLibrary.length === 0 ? (
                  <div className="text-gray-500 text-sm py-8 text-center">
                    {library.length === 0 ? 'Biblioteca vacía. Subí MP3s primero.' : 'Sin resultados.'}
                  </div>
                ) : (
                  filteredLibrary.map((t) => {
                    const inPlaylist = inPlaylistIds.has(t.id)
                    const isSelected = selectedTrackIds.has(t.id)
                    return (
                      <div
                        key={t.id}
                        className={`flex items-center gap-2 p-2 rounded ${
                          inPlaylist ? 'bg-gray-800/50 opacity-40' : isSelected ? 'bg-indigo-900/40 border border-indigo-700' : 'bg-gray-800/50 hover:bg-gray-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={inPlaylist}
                          onChange={() => toggleSelectTrack(t.id)}
                          className="rounded flex-shrink-0"
                        />
                        <div className="flex-shrink-0 w-8 h-8">
                          {t.coverUrl ? (
                            <img src={t.coverUrl} alt="" className="w-8 h-8 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          ) : (
                            <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-gray-500 text-xs">🎵</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm truncate">{t.title}</div>
                          <div className="text-xs text-gray-500 truncate">{t.artist || 'Sin artista'} · {fmtDuration(t.duration)}</div>
                        </div>
                        {inPlaylist ? (
                          <span className="text-xs text-gray-500 flex-shrink-0">En playlist</span>
                        ) : (
                          <button
                            onClick={() => togglePlay(t.id, t.title)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                              playingId === t.id ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                            title={playingId === t.id ? 'Detener' : 'Previsualizar'}
                          >
                            {playingId === t.id ? '⏹' : '▶'}
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
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

        {playlist.entries.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Playlist vacía. Agregá tracks desde tu biblioteca.
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
                className={`flex items-center gap-3 p-3 border-b border-gray-700/50 cursor-move transition ${
                  draggingIdx === idx ? 'opacity-30' :
                  dragOverIdx === idx ? 'bg-cyan-900/30 border-cyan-600' :
                  'hover:bg-gray-700/30'
                }`}
              >
                <span className="text-gray-500 text-sm w-8 text-center select-none">
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
                    <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-gray-500 text-xs">🎵</div>
                  )}
                </div>
                <button
                  onClick={() => togglePlay(entry.trackId, entry.title)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                    playingId === entry.trackId
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title={playingId === entry.trackId ? 'Detener' : 'Previsualizar'}
                >
                  {playingId === entry.trackId ? '⏹' : '▶'}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-white truncate">{entry.title}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {entry.artist || 'Sin artista'} · {fmtDuration(entry.duration)}
                  </div>
                </div>
                <button
                  onClick={() => removeTrack(entry.trackId, entry.title)}
                  className="text-red-400 hover:text-red-300 text-sm px-2"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
