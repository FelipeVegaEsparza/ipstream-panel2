'use client'

import { useEffect, useState, useRef } from 'react'

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
        throw new Error(data?.message || 'Error al guardar configuración')
      }
      const data = await res.json()
      setConfig({ jinglePlayEvery: data.jinglePlayEvery, jinglePlayCount: data.jinglePlayCount })
    } catch (err: any) {
      alert(err.message)
    } finally {
      setConfigSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar jingle "${name}"?`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/dashboard/streaming/jingles/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      await load()
    } catch (err: any) {
      alert(err.message)
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
      if (!res.ok) throw new Error('Error al guardar')
      setEditingId(null)
      await load()
    } catch (err: any) {
      alert(err.message)
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
      alert(err.message)
    } finally {
      setCoverUploadingId(null)
      setCoverJingleId(null)
    }
  }

  const handleCoverDelete = async (jingleId: string) => {
    if (!confirm('¿Eliminar carátula?')) return
    setCoverDeletingId(jingleId)
    try {
      const res = await fetch(`/api/dashboard/streaming/jingles/${jingleId}/cover`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar carátula')
      await load()
    } catch (err: any) {
      alert(err.message)
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Jingles</h1>
        <p className="mt-1 text-sm text-gray-400">
          Subí cuñas publicitarias que se intercalarán automáticamente en la reproducción.
        </p>
      </div>

      {/* Config card */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Regla de inserción</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Cada X canciones</label>
            <input
              type="number"
              min={1}
              max={100}
              value={configEvery}
              onChange={(e) => setConfigEvery(Math.max(1, parseInt(e.target.value) || 1))}
              className="bg-gray-900 text-white px-3 py-2 rounded w-24 border border-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Reproducir Y jingles</label>
            <input
              type="number"
              min={1}
              max={20}
              value={configCount}
              onChange={(e) => setConfigCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="bg-gray-900 text-white px-3 py-2 rounded w-24 border border-gray-700"
            />
          </div>
          <button
            onClick={saveConfig}
            disabled={configSaving}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {configSaving ? 'Guardando...' : 'Guardar regla'}
          </button>
          <p className="text-xs text-gray-500 ml-2">
            Ej: cada {configEvery} canciones → {configCount} jingle{configCount !== 1 ? 's' : ''}
            {config.jinglePlayEvery !== configEvery || config.jinglePlayCount !== configCount ? ' (sin guardar)' : ''}
          </p>
        </div>
      </div>

      {/* Upload zone */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-3">Subir jingle</h2>
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
              alert(err.message)
            }
            e.target.value = ''
          }}
          className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer"
        />
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-x-auto">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {loading ? 'Cargando...' : `${jingles.length} jingle${jingles.length !== 1 ? 's' : ''}`}
          </h2>
          <a href="/dashboard/streaming" className="text-sm text-cyan-400 hover:text-cyan-300">
            ← Volver a Streaming
          </a>
        </div>
        {jingles.length === 0 && !loading ? (
          <div className="p-12 text-center text-gray-500">
            No hay jingles todavía. Subí tu primer MP3 publicitario.
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
              {jingles.map((j) => (
                <tr key={j.id} className="border-t border-gray-700/50 hover:bg-gray-700/20">
                  <td className="p-3">
                    <button
                      onClick={() => togglePlay(j.id, j.title)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                        playingId === j.id
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                      title={playingId === j.id ? 'Detener' : 'Previsualizar'}
                    >
                      {playingId === j.id ? '⏹' : '▶'}
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
                            if (file) handleCoverUpload(j.id, file)
                          }}
                        />
                        <button
                          onClick={() => {
                            setCoverJingleId(j.id)
                            coverInputRef.current?.click()
                          }}
                          disabled={coverUploadingId === j.id || coverDeletingId === j.id}
                          className="absolute -bottom-1 -right-1 w-5 h-5 bg-cyan-600 rounded-full flex items-center justify-center text-white text-xs hover:bg-cyan-500 disabled:opacity-50"
                          title="Subir carátula"
                        >
                          {coverUploadingId === j.id ? '⏳' : '📷'}
                        </button>
                        {j.coverUrl && (
                          <button
                            onClick={() => handleCoverDelete(j.id)}
                            disabled={coverDeletingId === j.id}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-white text-[8px] hover:bg-red-500 disabled:opacity-50"
                            title="Eliminar carátula"
                          >
                            {coverDeletingId === j.id ? '⏳' : '✕'}
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
                        <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center text-gray-500 text-lg">
                          🎵
                        </div>
                      )
                    )}
                  </td>
                  <td className="p-3 text-white">
                    {editingId === j.id ? (
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="bg-gray-900 text-white px-2 py-1 rounded w-full"
                      />
                    ) : (
                      j.title
                    )}
                  </td>
                  <td className="p-3 text-gray-300 hidden sm:table-cell">
                    {editingId === j.id ? (
                      <input
                        value={editArtist}
                        onChange={(e) => setEditArtist(e.target.value)}
                        placeholder="Sin artista"
                        className="bg-gray-900 text-white px-2 py-1 rounded w-full"
                      />
                    ) : (
                      j.artist || <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="p-3 text-gray-300 whitespace-nowrap">{fmtDuration(j.duration)}</td>
                  <td className="p-3 text-gray-400 hidden md:table-cell">{fmtSize(j.fileSize)}</td>
                  <td className="p-3 text-right">
                    {editingId === j.id ? (
                      <>
                        <button onClick={saveEdit} disabled={savingEdit} className="text-green-400 hover:text-green-300 disabled:text-green-700 mr-3 text-xs">
                          {savingEdit ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button onClick={() => { if (!savingEdit) setEditingId(null) }} className="text-gray-400 hover:text-gray-300 text-xs disabled:opacity-50" disabled={savingEdit}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(j)} className="text-cyan-400 hover:text-cyan-300 mr-3 text-xs">Editar</button>
                        <button
                          onClick={() => handleDelete(j.id, j.title)}
                          disabled={deletingId === j.id}
                          className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50"
                        >
                          {deletingId === j.id ? 'Borrando...' : 'Eliminar'}
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
