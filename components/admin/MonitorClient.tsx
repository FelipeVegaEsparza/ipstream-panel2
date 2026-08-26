'use client'

// =====================================================
// MonitorClient — /admin/monitor
// Estado del servidor + streaming de clientes en vivo
// =====================================================

import { useEffect, useState, useRef, useCallback } from 'react'
import { ClientMigrateModal } from '@/components/admin/ClientMigrateModal'

interface HostStats {
  loadAvg?: { one: number; five: number; fifteen: number }
  cpuCount?: number
  memory?: { totalMB: number; freeMB: number; usedMB: number; percentUsed: number }
  disk?: { totalMB: number; usedMB: number; freeMB: number; percentUsed: number }
  uptime?: number
  containers?: number
}

interface ClientStatus {
  clientId: string
  clientName: string
  email: string
  hasRadio: boolean
  radioStatus: string | null
  radioServerOnline: boolean
  hasVideo: boolean
  videoStatus: string | null
  videoServerOnline: boolean
  listeners: number
  viewers: number
}

interface ServerHealthRow {
  server: {
    id: string
    name: string
    type: string
    isActive: boolean
    isHealthy: boolean
    lastHealthAt: string | null
  }
  online: boolean
  radioClients: number
  videoClients: number
  affectedClients: number
}

interface ServerHostStat {
  serverId: string
  name: string
  type: string
  online: boolean
  stats: HostStats | null
}

const REFRESH_MS = 10000

function fmtBytesMB(mb: number | undefined) {
  if (mb === undefined || mb === null) return '—'
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
  return `${Math.round(mb)} MB`
}

function fmtUptime(secs: number | undefined) {
  if (secs === undefined || secs === null) return '—'
  const days = Math.floor(secs / 86400)
  const hours = Math.floor((secs % 86400) / 3600)
  const mins = Math.floor((secs % 3600) / 60)
  return `${days}d ${hours}h ${mins}m`
}

function StatusBadge({ status, has, unavailable }: { status: string | null; has: boolean; unavailable?: boolean }) {
  if (!has) {
    return <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-500">Sin servicio</span>
  }
  if (unavailable) {
    return <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded bg-red-900 text-red-300">⚠ Sin respuesta</span>
  }
  if (status === 'autodj') {
    return <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded bg-green-900 text-green-300">● AutoDJ</span>
  }
  if (status === 'live') {
    return <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded bg-red-900 text-red-300 animate-pulse">● EN VIVO</span>
  }
  return <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">⏸ OFF</span>
}

export function MonitorClient() {
  const [host, setHost] = useState<HostStats | null>(null)
  const [clients, setClients] = useState<ClientStatus[]>([])
  const [servers, setServers] = useState<ServerHealthRow[]>([])
  const [serverStats, setServerStats] = useState<ServerHostStat[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [migrateClient, setMigrateClient] = useState<{ id: string; name: string } | null>(null)
  const mountedRef = useRef(true)

  const load = useCallback(async () => {
    try {
      setRefreshing(true)
      const [hRes, cRes, sRes, hsRes] = await Promise.all([
        fetch('/api/admin/server-stats', { cache: 'no-store' }),
        fetch('/api/admin/clients-status', { cache: 'no-store' }),
        fetch('/api/admin/servers/health', { cache: 'no-store' }),
        fetch('/api/admin/servers/host-stats', { cache: 'no-store' }),
      ])
      if (hRes.ok) setHost(await hRes.json())
      if (cRes.ok) {
        const data: { clients: ClientStatus[] } = await cRes.json()
        setClients(data.clients || [])
      }
      if (sRes.ok) {
        const data = await sRes.json()
        setServers(data.servers || [])
      }
      if (hsRes.ok) {
        const data = await hsRes.json()
        setServerStats(data.servers || [])
      }
      setLastUpdate(new Date())
      setError(null)
    } catch (err) {
      setError('Error al cargar el monitoreo')
      console.error('[monitor] error:', err)
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    load()
    const interval = setInterval(() => {
      if (mountedRef.current) load()
    }, REFRESH_MS)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [load])

  const loadAvgPct = host?.loadAvg?.one && host.cpuCount
    ? Math.round((host.loadAvg.one / host.cpuCount) * 100)
    : null

  const onlineRadio = clients.filter((c) => c.radioStatus === 'autodj' || c.radioStatus === 'live').length
  const onlineVideo = clients.filter((c) => c.videoStatus === 'autodj' || c.videoStatus === 'live').length
  const totalListeners = clients.reduce((s, c) => s + c.listeners, 0)
  const totalViewers = clients.reduce((s, c) => s + c.viewers, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Monitor</h1>
          <p className="mt-1 text-sm text-gray-400">
            Estado del servidor y de los streams de audio y video. Actualiza cada 10s.
            {lastUpdate && (
              <span className="ml-2 text-xs text-gray-500">
                Última actualización: {lastUpdate.toLocaleTimeString('es-ES')}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded-lg"
        >
          {refreshing ? '↻ Actualizando...' : '↻ Refrescar'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700/40 text-red-300 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : (
        <>
          {/* ====== SERVIDORES DE STREAMING ====== */}
          <div className="bg-gray-800 rounded-lg p-5">
            <h2 className="text-lg font-semibold text-white mb-3">Servidores de Streaming</h2>
            {servers.length === 0 ? (
              <p className="text-sm text-gray-500">
                No hay servidores de streaming registrados. Agregalos en{' '}
                <a href="/admin/servers" className="text-cyan-400 hover:text-cyan-300">Servidores de Streaming</a>.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {servers.map((s) => (
                  <div key={s.server.id} className={`rounded-lg border p-3 ${s.online ? 'border-green-700/40' : 'border-red-700/40'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{s.server.name}</span>
                      {s.online ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-900 text-green-300">● En línea</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-900 text-red-300">⚠ Caído</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {s.server.type === 'radio' ? 'Radio' : s.server.type === 'tv' ? 'TV' : 'Radio+TV'} ·{' '}
                      {s.radioClients} radios · {s.videoClients} TV
                    </div>
                    {!s.online && s.server.isActive && (
                      <div className="text-xs text-red-400 mt-1">{s.affectedClients} clientes afectados</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ====== SERVIDORES — USO DEL HOST ====== */}
          {serverStats.length > 0 ? (
            <div className="space-y-4">
              {serverStats.map((srv) => {
                const st = srv.stats
                const pct = st?.loadAvg?.one && st.cpuCount
                  ? Math.round((st.loadAvg.one / st.cpuCount) * 100)
                  : null
                return (
                  <div key={srv.serverId} className={`rounded-xl border p-4 ${srv.online ? 'border-gray-700 bg-gray-800/60' : 'border-red-700/40 bg-gray-800/40'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-white">{srv.name}</p>
                        <p className="text-xs text-gray-500">{srv.type === 'radio' ? 'Radio' : srv.type === 'tv' ? 'TV' : 'Radio + TV'}</p>
                      </div>
                      {srv.online ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-900 text-green-300">● En línea</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-900 text-red-300">⚠ Sin datos</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div>
                        <div className="text-xs text-gray-400 uppercase">CPU Load (1m)</div>
                        <div className={`text-xl font-bold mt-1 ${pct !== null && pct > 80 ? 'text-red-400' : pct !== null && pct > 50 ? 'text-yellow-400' : 'text-white'}`}>
                          {st?.loadAvg?.one?.toFixed(2) ?? '—'}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{st?.cpuCount ?? '—'} cores · {pct !== null ? `${pct}%` : '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 uppercase">Load 5m / 15m</div>
                        <div className="text-xl font-bold text-white mt-1">{st?.loadAvg?.five?.toFixed(2) ?? '—'} / {st?.loadAvg?.fifteen?.toFixed(2) ?? '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 uppercase">Memoria</div>
                        <div className={`text-xl font-bold mt-1 ${st?.memory?.percentUsed && st.memory.percentUsed > 90 ? 'text-red-400' : 'text-white'}`}>{st?.memory?.percentUsed ?? '—'}%</div>
                        <div className="text-xs text-gray-500 mt-0.5">{fmtBytesMB(st?.memory?.usedMB)} / {fmtBytesMB(st?.memory?.totalMB)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 uppercase">Disco</div>
                        <div className={`text-xl font-bold mt-1 ${st?.disk?.percentUsed && st.disk.percentUsed > 85 ? 'text-red-400' : 'text-white'}`}>{st?.disk?.percentUsed ?? '—'}%</div>
                        <div className="text-xs text-gray-500 mt-0.5">{fmtBytesMB(st?.disk?.usedMB)} / {fmtBytesMB(st?.disk?.totalMB)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 uppercase">Uptime</div>
                        <div className="text-xl font-bold text-white mt-1">{fmtUptime(st?.uptime)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 uppercase">Contenedores</div>
                        <div className="text-xl font-bold text-white mt-1">{st?.containers ?? '—'}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            // Fallback: un solo servidor (env legacy, sin registro en DB)
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-400 uppercase">CPU Load (1m)</div>
                <div className={`text-2xl font-bold mt-1 ${loadAvgPct !== null && loadAvgPct > 80 ? 'text-red-400' : loadAvgPct !== null && loadAvgPct > 50 ? 'text-yellow-400' : 'text-white'}`}>
                  {host?.loadAvg?.one?.toFixed(2) ?? '—'}
                </div>
                <div className="text-xs text-gray-500 mt-1">{host?.cpuCount ?? '—'} cores · {loadAvgPct !== null ? `${loadAvgPct}%` : '—'}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-400 uppercase">Load 5m / 15m</div>
                <div className="text-2xl font-bold text-white mt-1">{host?.loadAvg?.five?.toFixed(2) ?? '—'} / {host?.loadAvg?.fifteen?.toFixed(2) ?? '—'}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-400 uppercase">Memoria</div>
                <div className={`text-2xl font-bold mt-1 ${host?.memory?.percentUsed && host.memory.percentUsed > 90 ? 'text-red-400' : 'text-white'}`}>{host?.memory?.percentUsed ?? '—'}%</div>
                <div className="text-xs text-gray-500 mt-1">{fmtBytesMB(host?.memory?.usedMB)} / {fmtBytesMB(host?.memory?.totalMB)}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-400 uppercase">Disco</div>
                <div className={`text-2xl font-bold mt-1 ${host?.disk?.percentUsed && host.disk.percentUsed > 85 ? 'text-red-400' : 'text-white'}`}>{host?.disk?.percentUsed ?? '—'}%</div>
                <div className="text-xs text-gray-500 mt-1">{fmtBytesMB(host?.disk?.usedMB)} / {fmtBytesMB(host?.disk?.totalMB)}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-400 uppercase">Uptime</div>
                <div className="text-2xl font-bold text-white mt-1">{fmtUptime(host?.uptime)}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-400 uppercase">Contenedores</div>
                <div className="text-2xl font-bold text-white mt-1">{host?.containers ?? '—'}</div>
              </div>
            </div>
          )}

          {/* ====== RESUMEN CLIENTES ====== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-xs text-gray-400 uppercase">Radios online</div>
              <div className="text-2xl font-bold text-green-400 mt-1">{onlineRadio} / {clients.filter(c => c.hasRadio).length}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-xs text-gray-400 uppercase">Videos online</div>
              <div className="text-2xl font-bold text-green-400 mt-1">{onlineVideo} / {clients.filter(c => c.hasVideo).length}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-xs text-gray-400 uppercase">Oyentes</div>
              <div className="text-2xl font-bold text-cyan-400 mt-1">{totalListeners}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-xs text-gray-400 uppercase">Espectadores</div>
              <div className="text-2xl font-bold text-cyan-400 mt-1">{totalViewers}</div>
            </div>
          </div>

          {/* ====== TABLA CLIENTES ====== */}
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-900/50 text-gray-400 uppercase text-xs">
                <tr>
                  <th className="text-left p-3">Cliente</th>
                  <th className="text-left p-3">Audio</th>
                  <th className="text-left p-3">Video</th>
                  <th className="text-right p-3">Oyentes</th>
                  <th className="text-right p-3">Espectadores</th>
                  <th className="text-right p-3">Acción</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.clientId} className="border-t border-gray-700/50 hover:bg-gray-700/20">
                    <td className="p-3">
                      <div className="text-white font-medium">{c.clientName}</div>
                      <div className="text-xs text-gray-500">{c.email}</div>
                    </td>
                    <td className="p-3"><StatusBadge status={c.radioStatus} has={c.hasRadio} unavailable={c.hasRadio && !c.radioServerOnline} /></td>
                    <td className="p-3"><StatusBadge status={c.videoStatus} has={c.hasVideo} unavailable={c.hasVideo && !c.videoServerOnline} /></td>
                    <td className="p-3 text-right text-white">{c.listeners}</td>
                    <td className="p-3 text-right text-white">{c.viewers}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setMigrateClient({ id: c.clientId, name: c.clientName })}
                        className="text-xs px-2 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        ⇄ Migrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clients.length === 0 && (
              <div className="p-8 text-center text-gray-500">No hay clientes</div>
            )}
          </div>

          <ClientMigrateModal
            clientId={migrateClient?.id || ''}
            clientName={migrateClient?.name || ''}
            open={!!migrateClient}
            onClose={() => setMigrateClient(null)}
            onMigrated={load}
          />
        </>
      )}
    </div>
  )
}
