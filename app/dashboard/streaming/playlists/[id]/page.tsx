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
}

interface Entry {
  entryId: string
  order: number
  trackId: string
  title: string
  artist: string | null
  duration: number | null
  fileName: string
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
  const [reordering, setReordering] = useState(false)
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const dragStateRef = useRef<{ from: number; to: number } | null>(null)

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
  const onDrop = async (toIdx: number) => {
    if (draggingIdx === null || draggingIdx === toIdx || !playlist) {
      setDraggingIdx(null)
      setDragOverIdx(null)
      return
    }
    // Reordenar localmente
    const entries = [...playlist.entries]
    const [moved] = entries.splice(draggingIdx, 1)
    entries.splice(toIdx, 0, moved)
    setPlaylist({ ...playlist, entries })
    setDraggingIdx(null)
    setDragOverIdx(null)
    // Persistir
    setReordering(true)
    try {
      const res = await fetch(`/api/dashboard/streaming/playlists/${id}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackIds: entries.map((e) => e.trackId) }),
      })
      if (!res.ok) throw new Error('Error guardando orden')
    } catch (err: any) {
      alert(err.message)
      await load()
    } finally {
      setReordering(false)
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
              <button onClick={saveEdit} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded">
                Guardar
              </button>
              <button onClick={() => { setEditing(false); load() }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">
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
              {reordering && <span className="text-cyan-400">⏳ Guardando orden...</span>}
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
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded"
          >
            {showAdd ? 'Cerrar' : '+ Agregar tracks'}
          </button>
        </div>

        {showAdd && (
          <div className="p-4 border-b border-gray-700 bg-gray-900/50 space-y-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Buscar en biblioteca..."
              className="w-full bg-gray-900 text-white px-3 py-2 rounded border border-gray-700"
            />
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredLibrary.length === 0 ? (
                <div className="text-gray-500 text-sm py-2">
                  {library.length === 0 ? 'Biblioteca vacía. Subí MP3s primero.' : 'Sin resultados.'}
                </div>
              ) : (
                filteredLibrary.map((t) => {
                  const inPlaylist = inPlaylistIds.has(t.id)
                  return (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between p-2 rounded ${
                        inPlaylist ? 'bg-gray-800/50 opacity-50' : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      <div>
                        <div className="text-white text-sm">{t.title}</div>
                        <div className="text-xs text-gray-500">{t.artist || 'Sin artista'} · {fmtDuration(t.duration)}</div>
                      </div>
                      <button
                        onClick={() => addTrack(t.id)}
                        disabled={inPlaylist}
                        className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white text-xs rounded"
                      >
                        {inPlaylist ? 'En playlist' : 'Agregar'}
                      </button>
                    </div>
                  )
                })
              )}
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
