'use client'

import { useEffect, useState, useCallback } from 'react'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

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
  const { t, locale } = useDashboardI18n()
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
    return d.toLocaleTimeString(locale === 'en' ? 'en-US' : 'es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: locale === 'en' })
  }

  const typeBadge = (type: string) => {
    const label = type === 'live_dj' ? 'live' : type
    return (
      <span className={`text-[10px] font-medium ${type === 'live_dj' ? 'text-live' : 'text-muted-foreground'}`}>
        {label}
      </span>
    )
  }

  return (
    <div className="dashboard-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-medium text-foreground">{t('streaming.history.title')}</h2>
        <span className="text-[11px] text-muted-foreground">
          {data ? t('streaming.history.records', { count: data.total }) : ''}
        </span>
      </div>

      {!data || data.entries.length === 0 ? (
        <p className="py-10 text-center text-[12px] text-muted-foreground">
          {loading ? t('streaming.history.loading') : t('streaming.history.empty')}
        </p>
      ) : (
        <>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-line text-[10px] text-muted-foreground">
                  <th className="py-2 pr-4 text-left font-medium">{t('streaming.history.time')}</th>
                  <th className="py-2 pr-4 text-left font-medium">{t('streaming.history.track')}</th>
                  <th className="py-2 pr-4 text-left font-medium">{t('streaming.history.artist')}</th>
                  <th className="py-2 text-right font-medium">{t('streaming.history.type')}</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e) => (
                  <tr key={e.id} className="border-b border-line/60 hover:bg-surface-2">
                    <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-[11px] text-muted-foreground">
                      {fmtTime(e.playedAt)}
                    </td>
                    <td className="max-w-[200px] truncate py-2.5 pr-4 text-foreground">
                      {e.title || <em className="text-muted-foreground">—</em>}
                    </td>
                    <td className="max-w-[150px] truncate py-2.5 pr-4 text-muted-foreground">
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
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-control border border-line px-2.5 py-1.5 text-[11px] text-foreground transition-colors hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('streaming.history.previous')}
            </button>
            <div className="flex items-center gap-1">
              {renderPageButtons(page, data.totalPages, (p) => setPage(p))}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="rounded-control border border-line px-2.5 py-1.5 text-[11px] text-foreground transition-colors hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('streaming.history.next')}
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
      <span key={`e${idx}`} className="px-1 text-[11px] text-muted-foreground">...</span>
    ) : (
      <button
        key={p}
        onClick={() => goTo(p)}
        className={`rounded-control px-2.5 py-1 text-[11px] transition-colors ${
          p === current
            ? 'bg-surface-3 text-foreground'
            : 'text-muted-foreground hover:bg-surface-3 hover:text-foreground'
        }`}
      >
        {p}
      </button>
    )
  )
}
