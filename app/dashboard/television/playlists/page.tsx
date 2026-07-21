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

export default function TvPlaylistsPage() {
  const [playlists, setPlaylists] = useState<VideoPlaylist[]>([])
  const [tracks, setTracks] = useState<VideoTrack[]>([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)
  const [entries, setEntries] = useState<PlaylistEntry[]>([])
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchPlaylists = useCallback(async () => {
    try {
      const [plRes, trRes] = await Promise.all([
        fetch('/api/dashboard/television/playlists'),
        fetch('/api/dashboard/television/tracks?limit=500'),
      ])
      if (plRes.ok) {
        const data = await plRes.json()
        setPlaylists(data.playlists || [])
        if (data.playlists?.length > 0 && !selectedPlaylistId) {
          setSelectedPlaylistId(data.playlists[0].id)
        }
      }
      if (trRes.ok) {
        const data = await trRes.json()
        setTracks(data.tracks || [])
      }
    } catch (_) {
    } finally {
      setLoading(false)
    }
  }, [selectedPlaylistId])

  useEffect(() => { fetchPlaylists() }, [fetchPlaylists])

  const fetchEntries = useCallback(async () => {
    if (!selectedPlaylistId) return
    try {
      const res = await fetch(`/api/dashboard/television/playlists/${selectedPlaylistId}/entries`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
      }
    } catch (_) {}
  }, [selectedPlaylistId])

  useEffect(() => { fetchEntries() }, [fetchEntries])

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
      toast({ type: 'success', title: 'Track agregado' })
      fetchEntries()
      fetchPlaylists()
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

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (loading) return <div className="text-gray-400 p-6">Cargando...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Programación</h1>
        <p className="mt-1 text-sm text-gray-400">
          Creá y editá las playlists de video para tu canal de Televisión
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

          {/* Available tracks */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700/40 shadow-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-300">Videos disponibles</h3>
            {tracks.filter(t => !entries.some(e => e.trackId === t.id)).slice(0, 30).map(track => (
              <div key={track.id} className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => addTrack(track.id)}
                  className="text-cyan-400 hover:text-cyan-300 text-xs"
                  title="Agregar a playlist"
                >
                  +
                </button>
                <span className="flex-1 text-gray-400 truncate">{track.title}</span>
                <span className="text-gray-600 text-xs">{formatDuration(track.duration)}</span>
              </div>
            ))}
            {tracks.length === 0 && <p className="text-xs text-gray-600">Subí videos primero</p>}
          </div>
        </div>

        {/* Playlist entries */}
        <div className="flex-1">
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700/40 shadow-xl overflow-hidden">
            {!selectedPlaylistId ? (
              <div className="p-6 text-center text-gray-500">Seleccioná una playlist</div>
            ) : entries.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Playlist vacía. Agregá videos desde la lista de disponibles.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase">
                    <th className="text-left p-3">#</th>
                    <th className="text-left p-3">Thumbnail</th>
                    <th className="text-left p-3">Título</th>
                    <th className="text-left p-3">Duración</th>
                    <th className="text-right p-3">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <tr key={entry.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 text-sm">
                      <td className="p-3 text-gray-500">{idx + 1}</td>
                      <td className="p-3">
                        {entry.thumbnail ? (
                          <img src={entry.thumbnail} alt="" className="w-16 h-10 object-cover rounded" />
                        ) : (
                          <div className="w-16 h-10 bg-gray-700 rounded" />
                        )}
                      </td>
                      <td className="p-3 text-white">{entry.title}</td>
                      <td className="p-3 text-gray-400">{formatDuration(entry.duration)}</td>
                      <td className="p-3 text-right">
                        <button onClick={() => removeEntry(entry.id)} className="text-xs text-gray-500 hover:text-red-400">
                          Quitar
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
