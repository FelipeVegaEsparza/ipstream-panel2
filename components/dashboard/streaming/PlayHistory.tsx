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
        return <span className="text-xs bg-brand/30 text-brand px-2 py-0.5 rounded-full">🎵 music</span>
      case 'jingle':
        return <span className="text-xs bg-amber-600/30 text-amber-300 px-2 py-0.5 rounded-full">🔔 jingle</span>
      case 'live_dj':
        return <span className="text-xs bg-green-600/30 text-green-300 px-2 py-0.5 rounded-full">🎤 live</span>
      default:
        return <span className="text-xs bg-secondary/30 text-muted-foreground px-2 py-0.5 rounded-full">autodj</span>
    }
  }

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/40 shadow-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Historial de reproducción</h2>
        <span className="text-xs text-muted-foreground">
          {data ? `${data.total} registros` : ''}
        </span>
      </div>

      {!data || data.entries.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          {loading ? 'Cargando...' : 'Aún no hay historial de reproducción'}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs uppercase border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium">Hora</th>
                  <th className="text-left py-2 pr-4 font-medium">Título</th>
                  <th className="text-left py-2 pr-4 font-medium">Artista</th>
                  <th className="text-right py-2 font-medium">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e) => (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="py-2.5 pr-4 text-muted-foreground font-mono text-xs whitespace-nowrap">
                      {fmtTime(e.playedAt)}
                    </td>
                    <td className="py-2.5 pr-4 text-foreground max-w-[200px] truncate">
                      {e.title || <em className="text-muted-foreground">—</em>}
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground max-w-[150px] truncate">
                      {e.artist || <em className="text-muted-foreground">—</em>}
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
              className="px-3 py-1.5 text-xs bg-secondary hover:bg-secondary disabled:bg-card disabled:text-muted-foreground text-foreground rounded transition-colors"
            >
              « Anterior
            </button>
            <div className="flex items-center gap-1">
              {renderPageButtons(page, data.totalPages, (p) => setPage(p))}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="px-3 py-1.5 text-xs bg-secondary hover:bg-secondary disabled:bg-card disabled:text-muted-foreground text-foreground rounded transition-colors"
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
