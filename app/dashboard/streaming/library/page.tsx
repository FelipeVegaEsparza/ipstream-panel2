'use client'

// =====================================================
// Page — /dashboard/streaming/library
// =====================================================

import { useEffect, useState, useRef } from 'react'
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
  uploadedAt: string
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

interface StorageInfo {
  totalMB: number
  quotaMB: number | null
  percentUsed: number | null
  remainingMB: number | null
  exceeded: boolean
  trackCount: number
}

export default function LibraryPage() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [storage, setStorage] = useState<StorageInfo | null>(null)
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

  const load = async () => {
    try {
      setLoading(true)
      const [res, storageRes] = await Promise.all([
        fetch('/api/dashboard/streaming/library', { cache: 'no-store' }),
        fetch('/api/dashboard/streaming/library/storage', { cache: 'no-store' }),
      ])
      if (res.ok) {
        const data = await res.json()
        setTracks(data.tracks || [])
      }
      if (storageRes.ok) {
        setStorage(await storageRes.json())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/dashboard/streaming/library/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      await load()
    } catch (err: any) {
      alert(err.message)
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
      if (!res.ok) throw new Error('Error al guardar')
      setEditingId(null)
      await load()
    } catch (err: any) {
      alert(err.message)
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
      alert(err.message)
    } finally {
      setCoverUploadingId(null)
      setCoverTrackId(null)
    }
  }

  const handleCoverDelete = async (trackId: string) => {
    if (!confirm('¿Eliminar carátula?')) return
    setCoverDeletingId(trackId)
    try {
      const res = await fetch(`/api/dashboard/streaming/library/${trackId}/cover`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar carátula')
      await load()
    } catch (err: any) {
      alert(err.message)
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
        alert(`Error al reproducir "${trackTitle}"`)
      }
      audio.play().catch(() => {
        setPlayingId(null)
        alert(`Error al reproducir "${trackTitle}"`)
      })
      audioRef.current = audio
      setPlayingId(id)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Biblioteca</h1>
        <p className="mt-1 text-sm text-gray-400">
          Subí tus MP3s para usar en las playlists de AutoDJ.
        </p>
      </div>

      {storage && (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700/40 shadow-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-sm font-semibold text-gray-300">Almacenamiento</span>
            </div>
            <span className="text-xs text-gray-400 font-mono">
              {storage.totalMB.toFixed(1)} MB {storage.quotaMB ? `/ ${storage.quotaMB} MB` : 'usados'}
            </span>
          </div>
          {storage.quotaMB && storage.percentUsed !== null ? (
            <>
              <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    storage.exceeded ? 'bg-red-500' : storage.percentUsed > 80 ? 'bg-amber-500' : 'bg-cyan-500'
                  }`}
                  style={{ width: `${Math.min(storage.percentUsed, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className={storage.exceeded ? 'text-red-400' : 'text-gray-400'}>
                  {storage.percentUsed.toFixed(1)}% usado
                </span>
                <span className="text-gray-500">
                  {storage.remainingMB !== null ? `${storage.remainingMB.toFixed(1)} MB libres` : '—'}
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
              Sin límite de almacenamiento configurado
            </div>
          )}
        </div>
      )}

      <LibraryUploader onUploaded={load} />

      <div className="bg-gray-800 rounded-lg shadow-lg overflow-x-auto">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {loading ? 'Cargando...' : `${tracks.length} track${tracks.length !== 1 ? 's' : ''}`}
          </h2>
          <a href="/dashboard/streaming" className="text-sm text-cyan-400 hover:text-cyan-300">
            ← Volver a Streaming
          </a>
        </div>
        {tracks.length === 0 && !loading ? (
          <div className="p-12 text-center text-gray-500">
            No hay tracks todavía. Subí tu primer MP3.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-900/50 text-gray-400 uppercase text-xs">
              <tr>
                <th className="text-left p-3 w-10">🎵</th>
                <th className="text-left p-3 w-12">Carátula</th>
                <th className="text-left p-3">Título</th>
                <th className="text-left p-3 hidden sm:table-cell">Artista</th>
                <th className="text-left p-3">Duración</th>
                <th className="text-left p-3 hidden md:table-cell">Tamaño</th>
                <th className="text-right p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((t) => (
                <tr key={t.id} className="border-t border-gray-700/50 hover:bg-gray-700/20">
                  <td className="p-3">
                    <button
                      onClick={() => togglePlay(t.id, t.title)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                        playingId === t.id
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                      title={playingId === t.id ? 'Detener' : 'Previsualizar'}
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
                          <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center text-gray-500 text-lg">
                            🎵
                          </div>
                        )}
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleCoverUpload(t.id, file)
                          }}
                        />
                        <button
                          onClick={() => {
                            setCoverTrackId(t.id)
                            coverInputRef.current?.click()
                          }}
                          disabled={coverUploadingId === t.id || coverDeletingId === t.id}
                          className="absolute -bottom-1 -right-1 w-5 h-5 bg-cyan-600 rounded-full flex items-center justify-center text-white text-xs hover:bg-cyan-500 disabled:opacity-50"
                          title="Subir carátula"
                        >
                          {coverUploadingId === t.id ? '⏳' : '📷'}
                        </button>
                        {t.coverUrl && (
                          <button
                            onClick={() => handleCoverDelete(t.id)}
                            disabled={coverDeletingId === t.id}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-white text-[8px] hover:bg-red-500 disabled:opacity-50"
                            title="Eliminar carátula"
                          >
                            {coverDeletingId === t.id ? '⏳' : '✕'}
                          </button>
                        )}
                      </div>
                    ) : (
                      t.coverUrl ? (
                        <img
                          src={t.coverUrl}
                          alt=""
                          className="w-10 h-10 rounded object-cover shadow-sm"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center text-gray-500 text-lg">
                          🎵
                        </div>
                      )
                    )}
                  </td>
                  <td className="p-3 text-white">
                    {editingId === t.id ? (
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="bg-gray-900 text-white px-2 py-1 rounded w-full"
                      />
                    ) : (
                      t.title
                    )}
                  </td>
                  <td className="p-3 text-gray-300 hidden sm:table-cell">
                    {editingId === t.id ? (
                      <input
                        value={editArtist}
                        onChange={(e) => setEditArtist(e.target.value)}
                        placeholder="Sin artista"
                        className="bg-gray-900 text-white px-2 py-1 rounded w-full"
                      />
                    ) : (
                      t.artist || <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="p-3 text-gray-300 whitespace-nowrap">{fmtDuration(t.duration)}</td>
                  <td className="p-3 text-gray-400 hidden md:table-cell">{fmtSize(t.fileSize)}</td>
                  <td className="p-3 text-right">
                      {editingId === t.id ? (
                        <>
                          <button onClick={saveEdit} disabled={savingEdit} className="text-green-400 hover:text-green-300 disabled:text-green-700 mr-3 text-xs">
                            {savingEdit ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button onClick={() => { if (!savingEdit) { setEditingId(null); setCoverTrackId(null) } }} className="text-gray-400 hover:text-gray-300 text-xs disabled:opacity-50" disabled={savingEdit}>
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(t)} className="text-cyan-400 hover:text-cyan-300 mr-3 text-xs">Editar</button>
                          <button
                            onClick={() => handleDelete(t.id, t.title)}
                            disabled={deletingId === t.id}
                            className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50"
                          >
                            {deletingId === t.id ? 'Borrando...' : 'Eliminar'}
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
