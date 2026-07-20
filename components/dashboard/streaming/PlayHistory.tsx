'use client'

import { useEffect, useState, useCallback } from 'react'

interface HistoryEntry {
  id: string
  title: string
  artist: string | null
  type: 'music' | 'jingle' | 'autodj' | 'live_dj'
  playedAt: string
}

interface HistoryResponse {
  entries: HistoryEntry[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function PlayHistory() {
  const [data, setData] = useState<HistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const fetchHistory = useCallback(async (p: number) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/dashboard/streaming/history?page=${p}&limit=25`)
      if (!res.ok) return
      const json = await res.json()
      setData(json)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory(page)
  }, [page, fetchHistory])

  // Auto-refresh each 10s but stay on current page
  useEffect(() => {
    const timer = setInterval(() => {
      fetchHistory(page)
    }, 10000)
    return () => clearInterval(timer)
  }, [page, fetchHistory])

  const fmtTime = (iso: string) => {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  }

  const typeBadge = (type: string) => {
    switch (type) {
      case 'music':
        return <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded-full">🎵 music</span>
      case 'jingle':
        return <span className="text-xs bg-amber-600/30 text-amber-300 px-2 py-0.5 rounded-full">🔔 jingle</span>
      case 'live_dj':
        return <span className="text-xs bg-green-600/30 text-green-300 px-2 py-0.5 rounded-full">🎤 live</span>
      default:
        return <span className="text-xs bg-gray-600/30 text-gray-300 px-2 py-0.5 rounded-full">autodj</span>
    }
  }

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700/40 shadow-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Historial de reproducción</h2>
        <span className="text-xs text-gray-500">
          {data ? `${data.total} registros` : ''}
        </span>
      </div>

      {!data || data.entries.length === 0 ? (
        <p className="text-gray-500 text-sm py-8 text-center">
          {loading ? 'Cargando...' : 'Aún no hay historial de reproducción'}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs uppercase border-b border-gray-700">
                  <th className="text-left py-2 pr-4 font-medium">Hora</th>
                  <th className="text-left py-2 pr-4 font-medium">Título</th>
                  <th className="text-left py-2 pr-4 font-medium">Artista</th>
                  <th className="text-right py-2 font-medium">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e) => (
                  <tr key={e.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                    <td className="py-2.5 pr-4 text-gray-400 font-mono text-xs whitespace-nowrap">
                      {fmtTime(e.playedAt)}
                    </td>
                    <td className="py-2.5 pr-4 text-white max-w-[200px] truncate">
                      {e.title || <em className="text-gray-500">—</em>}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-300 max-w-[150px] truncate">
                      {e.artist || <em className="text-gray-500">—</em>}
                    </td>
                    <td className="py-2.5 text-right">
                      {typeBadge(e.type)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded transition-colors"
            >
              « Anterior
            </button>
            <div className="flex items-center gap-1">
              {renderPageButtons(page, data.totalPages, (p) => setPage(p))}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded transition-colors"
            >
              Siguiente »
            </button>
          </div>
        </>
      )}
    </div>
  )
}

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
      <span key={`e${idx}`} className="px-1 text-gray-500 text-xs">...</span>
    ) : (
      <button
        key={p}
        onClick={() => goTo(p)}
        className={`px-2.5 py-1 text-xs rounded transition-colors ${
          p === current
            ? 'bg-cyan-600 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`}
      >
        {p}
      </button>
    )
  )
}
