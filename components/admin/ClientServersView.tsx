'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Radio, MonitorPlay, Server } from 'lucide-react'

interface Row {
  clientId: string
  name: string
  email: string
  radio: {
    serverId: string | null
    serverName: string
    serverType: string | null
    agentHost: string | null
    mount: string
    telnetPort: number
    harborPort: number | null
    icecastPort: number
    publicUrl: string | null
  } | null
  video: {
    serverId: string | null
    serverName: string
    serverType: string | null
    agentHost: string | null
    streamKey: string
    rtmpPort: number
    hlsPort: number
    publicUrl: string | null
  } | null
}

function ServerBadge({ row }: { row: { serverId: string | null; serverName: string; serverType: string | null } }) {
  if (!row.serverId) return <span className="text-xs text-gray-500">Sin asignar</span>
  const typeLabel = row.serverType === 'radio' ? 'Radio' : row.serverType === 'tv' ? 'TV' : 'Radio+TV'
  return (
    <div className="flex items-center gap-1.5">
      <Server className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
      <span className="text-cyan-300">{row.serverName}</span>
      <span className="text-[10px] text-gray-500">({typeLabel})</span>
    </div>
  )
}

function CopyLink({ url }: { url: string | null }) {
  if (!url) return <span className="text-xs text-gray-600">—</span>
  return (
    <button
      onClick={() => navigator.clipboard.writeText(url)}
      title={url}
      className="text-xs text-gray-400 hover:text-cyan-300 font-mono max-w-[220px] truncate text-left"
    >
      {url}
    </button>
  )
}

export function ClientServersView() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/client-servers', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setRows(data.clients || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = rows.filter((r) =>
    `${r.name} ${r.email} ${r.radio?.serverName || ''} ${r.video?.serverName || ''} ${r.radio?.agentHost || ''} ${r.video?.agentHost || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          className="form-input max-w-sm"
          placeholder="Buscar por cliente, email, servidor o IP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button size="sm" variant="outline" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refrescar
        </Button>
        <span className="text-sm text-gray-400 ml-auto">{filtered.length} clientes</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/60 text-gray-400 uppercase text-xs">
            <tr>
              <th className="text-left p-3">Cliente</th>
              <th className="text-left p-3">Radio — Servidor</th>
              <th className="text-left p-3">Radio — URL / Puertos</th>
              <th className="text-left p-3">TV — Servidor</th>
              <th className="text-left p-3">TV — URL / Puertos</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.clientId} className="border-t border-gray-700/50 hover:bg-gray-700/20 align-top">
                <td className="p-3">
                  <div className="text-white font-medium">{r.name}</div>
                  <div className="text-xs text-gray-500">{r.email}</div>
                </td>
                <td className="p-3">
                  {r.radio ? (
                    <div className="space-y-1">
                      <ServerBadge row={r.radio} />
                      {r.radio.agentHost && <div className="text-xs text-gray-500">agente: {r.radio.agentHost}:4000</div>}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-600">Sin radio</span>
                  )}
                </td>
                <td className="p-3">
                  {r.radio ? (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400 flex items-center gap-1"><Radio className="h-3 w-3 text-cyan-400" /> <CopyLink url={r.radio.publicUrl} /></div>
                      <div className="text-xs text-gray-500 font-mono">
                        /{r.radio.mount} · icecast :8000
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        telnet :{r.radio.telnetPort} · harbor :{r.radio.harborPort ?? '—'}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-600">—</span>
                  )}
                </td>
                <td className="p-3">
                  {r.video ? (
                    <div className="space-y-1">
                      <ServerBadge row={r.video} />
                      {r.video.agentHost && <div className="text-xs text-gray-500">agente: {r.video.agentHost}:4000</div>}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-600">Sin TV</span>
                  )}
                </td>
                <td className="p-3">
                  {r.video ? (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400 flex items-center gap-1"><MonitorPlay className="h-3 w-3 text-cyan-400" /> <CopyLink url={r.video.publicUrl} /></div>
                      <div className="text-xs text-gray-500 font-mono">
                        rtmp :{r.video.rtmpPort} · hls :{r.video.hlsPort}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">key: {r.video.streamKey}</div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-600">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">{loading ? 'Cargando...' : 'Sin resultados'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
