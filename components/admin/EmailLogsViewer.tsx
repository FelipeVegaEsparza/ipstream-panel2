'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, MailOpen, MousePointerClick, AlertTriangle } from 'lucide-react'

interface LogRow {
  id: string
  to: string
  subject: string
  templateKey: string | null
  status: string
  openedAt: string | null
  clickedAt: string | null
  createdAt: string
  error: string | null
  client: { id: string; name: string } | null
}

const STATUS_STYLE: Record<string, string> = {
  sent: 'bg-blue-500/15 text-blue-400',
  delivered: 'bg-green-500/15 text-green-400',
  opened: 'bg-cyan-500/15 text-cyan-400',
  clicked: 'bg-purple-500/15 text-purple-400',
  bounced: 'bg-red-500/15 text-red-400',
  complained: 'bg-orange-500/15 text-orange-400',
  failed: 'bg-red-500/15 text-red-400',
  skipped: 'bg-gray-600/30 text-gray-400',
}

function fmt(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('es-CL')
}

export function EmailLogsViewer() {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<{ status: string; _count: { _all: number } }[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const limit = 25

  const load = async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (statusFilter !== 'all') qs.set('status', statusFilter)
      const res = await fetch(`/api/admin/emails/logs?${qs}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setTotal(data.total || 0)
        setStats(data.stats || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select className="form-input !py-1.5 !w-44" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
            <option value="all">Todos los estados</option>
            {[...new Set(['sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed', 'skipped'])].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refrescar
          </Button>
        </div>
        <p className="text-sm text-gray-400">{total} envíos</p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {stats.map((s) => (
          <Badge key={s.status} className={STATUS_STYLE[s.status] || 'bg-gray-600/30'}>
            {s.status}: {s._count._all}
          </Badge>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/60 text-gray-400 uppercase text-xs">
            <tr>
              <th className="text-left p-3">Cliente</th>
              <th className="text-left p-3">Destinatario</th>
              <th className="text-left p-3">Asunto</th>
              <th className="text-left p-3">Plantilla</th>
              <th className="text-left p-3">Estado</th>
              <th className="text-left p-3">Abierto</th>
              <th className="text-left p-3">Clic</th>
              <th className="text-left p-3">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-gray-700/50 hover:bg-gray-700/20">
                <td className="p-3">{l.client?.name || '—'}</td>
                <td className="p-3 text-gray-400">{l.to}</td>
                <td className="p-3 text-white max-w-[220px] truncate" title={l.subject}>{l.subject}</td>
                <td className="p-3"><code className="text-xs text-cyan-400">{l.templateKey || '—'}</code></td>
                <td className="p-3">
                  <Badge className={STATUS_STYLE[l.status] || 'bg-gray-600/30'}>{l.status}</Badge>
                  {l.error && <p className="text-[10px] text-red-400 mt-0.5 max-w-[160px] truncate" title={l.error}>{l.error}</p>}
                </td>
                <td className="p-3 text-gray-400 flex items-center gap-1">
                  <MailOpen className="h-3.5 w-3.5" /> {fmt(l.openedAt)}
                </td>
                <td className="p-3 text-gray-400 flex items-center gap-1">
                  <MousePointerClick className="h-3.5 w-3.5" /> {fmt(l.clickedAt)}
                </td>
                <td className="p-3 text-gray-400">{fmt(l.createdAt)}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">Sin envíos {statusFilter !== 'all' ? 'con ese estado' : ''}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Anterior</Button>
        <span className="text-sm text-gray-400">Página {page} de {totalPages}</span>
        <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente →</Button>
      </div>
    </div>
  )
}
