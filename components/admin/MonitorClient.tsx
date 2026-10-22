'use client'

// =====================================================
// MonitorClient — /admin/monitor
// Estado del servidor + streaming de clientes en vivo
// =====================================================

import { useEffect, useState, useRef, useCallback } from 'react'
import { ClientMigrateModal } from '@/components/admin/ClientMigrateModal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

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
  radioServerName: string | null
  radioServerOnline: boolean
  hasVideo: boolean
  videoStatus: string | null
  videoServerName: string | null
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
  accounts: number
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
  const { t } = useDashboardI18n()
  if (!has) {
    return <span className="text-xs px-2 py-0.5 rounded bg-card text-muted-foreground">{t('admin.monitor.statusNoService')}</span>
  }
  if (unavailable) {
    return <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded bg-red-900 text-red-300">{t('admin.monitor.statusNoResponse')}</span>
  }
  if (status === 'autodj') {
    return <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded bg-green-900 text-green-300">{t('admin.monitor.statusAutodj')}</span>
  }
  if (status === 'live') {
    return <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded bg-red-900 text-red-300 animate-pulse">{t('admin.monitor.statusLive')}</span>
  }
  return <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">{t('admin.monitor.statusOff')}</span>
}

export function MonitorClient() {
  const { locale, t } = useDashboardI18n()
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
      setError(t('admin.monitor.loadError'))
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
          <h1 className="text-3xl font-bold text-foreground">{t('admin.monitor.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('admin.monitor.subtitle')}
            {lastUpdate && (
              <span className="ml-2 text-xs text-muted-foreground">
                {t('admin.monitor.lastUpdate', { time: lastUpdate.toLocaleTimeString(locale === 'en' ? 'en-US' : 'es-ES') })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="px-4 py-2 bg-secondary hover:bg-secondary disabled:bg-card text-foreground rounded-lg"
        >
          {refreshing ? t('admin.monitor.refreshing') : t('admin.monitor.refresh')}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700/40 text-red-300 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{t('admin.monitor.loading')}</div>
      ) : (
        <Tabs defaultValue="servidores" className="space-y-6">
          <TabsList className="grid w-full md:w-auto grid-cols-2 bg-card border-border">
            <TabsTrigger value="servidores" className="data-[state=active]:bg-brand">{t('admin.monitor.serversTab')}</TabsTrigger>
            <TabsTrigger value="clientes" className="data-[state=active]:bg-brand">{t('admin.monitor.clientsTab')}</TabsTrigger>
          </TabsList>

          <TabsContent value="servidores" className="space-y-5">
            {/* ====== SERVIDORES DE STREAMING ====== */}
            <div className="bg-card rounded-lg p-5">
              <h2 className="text-lg font-semibold text-foreground mb-3">{t('admin.monitor.streamingServers')}</h2>
              {servers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('admin.monitor.noServers')}{' '}
                  <a href="/admin/servers" className="text-brand hover:text-brand">{t('admin.monitor.serversLink')}</a>.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {servers.map((s) => (
                    <div key={s.server.id} className={`rounded-lg border p-3 ${s.online ? 'border-green-700/40' : 'border-red-700/40'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{s.server.name}</span>
                        {s.online ? (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-900 text-green-300">{t('admin.monitor.online')}</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-900 text-red-300">{t('admin.monitor.down')}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {s.server.type === 'radio' ? 'Radio' : s.server.type === 'tv' ? 'TV' : 'Radio+TV'} ·{' '}
                        {s.accounts === 1 ? t('admin.monitor.accountsOne', { count: s.accounts }) : t('admin.monitor.accountsMany', { count: s.accounts })} · {s.radioClients} radios · {s.videoClients} TV
                      </div>
                      {!s.online && s.server.isActive && (
                        <div className="text-xs text-red-400 mt-1">{t('admin.monitor.affectedClients', { count: s.affectedClients })}</div>
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
                    <div key={srv.serverId} className={`rounded-xl border p-4 ${srv.online ? 'border-border bg-card/60' : 'border-red-700/40 bg-card/40'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-foreground">{srv.name}</p>
                          <p className="text-xs text-muted-foreground">{srv.type === 'radio' ? 'Radio' : srv.type === 'tv' ? 'TV' : 'Radio + TV'}</p>
                        </div>
                        {srv.online ? (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-900 text-green-300">{t('admin.monitor.online')}</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-900 text-red-300">{t('admin.monitor.noData')}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground uppercase">{t('admin.monitor.cpuLoad')}</div>
                          <div className={`text-xl font-bold mt-1 ${pct !== null && pct > 80 ? 'text-red-400' : pct !== null && pct > 50 ? 'text-yellow-400' : 'text-foreground'}`}>
                            {st?.loadAvg?.one?.toFixed(2) ?? '—'}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{t('admin.monitor.cores', { count: st?.cpuCount ?? '—' })} · {pct !== null ? `${pct}%` : '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground uppercase">{t('admin.monitor.load5m15m')}</div>
                          <div className="text-xl font-bold text-foreground mt-1">{st?.loadAvg?.five?.toFixed(2) ?? '—'} / {st?.loadAvg?.fifteen?.toFixed(2) ?? '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground uppercase">{t('admin.monitor.memory')}</div>
                          <div className={`text-xl font-bold mt-1 ${st?.memory?.percentUsed && st.memory.percentUsed > 90 ? 'text-red-400' : 'text-foreground'}`}>{st?.memory?.percentUsed ?? '—'}%</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{fmtBytesMB(st?.memory?.usedMB)} / {fmtBytesMB(st?.memory?.totalMB)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground uppercase">{t('admin.monitor.disk')}</div>
                          <div className={`text-xl font-bold mt-1 ${st?.disk?.percentUsed && st.disk.percentUsed > 85 ? 'text-red-400' : 'text-foreground'}`}>{st?.disk?.percentUsed ?? '—'}%</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{fmtBytesMB(st?.disk?.usedMB)} / {fmtBytesMB(st?.disk?.totalMB)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground uppercase">{t('admin.monitor.uptime')}</div>
                          <div className="text-xl font-bold text-foreground mt-1">{fmtUptime(st?.uptime)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground uppercase">{t('admin.monitor.containers')}</div>
                          <div className="text-xl font-bold text-foreground mt-1">{st?.containers ?? '—'}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              // Fallback: un solo servidor (env legacy, sin registro en DB)
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-card rounded-lg p-4">
                  <div className="text-xs text-muted-foreground uppercase">{t('admin.monitor.cpuLoad')}</div>
                  <div className={`text-2xl font-bold mt-1 ${loadAvgPct !== null && loadAvgPct > 80 ? 'text-red-400' : loadAvgPct !== null && loadAvgPct > 50 ? 'text-yellow-400' : 'text-foreground'}`}>
                    {host?.loadAvg?.one?.toFixed(2) ?? '—'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{t('admin.monitor.cores', { count: host?.cpuCount ?? '—' })} · {loadAvgPct !== null ? `${loadAvgPct}%` : '—'}</div>
                </div>
                <div className="bg-card rounded-lg p-4">
                  <div className="text-xs text-muted-foreground uppercase">{t('admin.monitor.load5m15m')}</div>
                  <div className="text-2xl font-bold text-foreground mt-1">{host?.loadAvg?.five?.toFixed(2) ?? '—'} / {host?.loadAvg?.fifteen?.toFixed(2) ?? '—'}</div>
                </div>
                <div className="bg-card rounded-lg p-4">
                  <div className="text-xs text-muted-foreground uppercase">{t('admin.monitor.memory')}</div>
                  <div className={`text-2xl font-bold mt-1 ${host?.memory?.percentUsed && host.memory.percentUsed > 90 ? 'text-red-400' : 'text-foreground'}`}>{host?.memory?.percentUsed ?? '—'}%</div>
                  <div className="text-xs text-muted-foreground mt-1">{fmtBytesMB(host?.memory?.usedMB)} / {fmtBytesMB(host?.memory?.totalMB)}</div>
                </div>
                <div className="bg-card rounded-lg p-4">
                  <div className="text-xs text-muted-foreground uppercase">{t('admin.monitor.disk')}</div>
                  <div className={`text-2xl font-bold mt-1 ${host?.disk?.percentUsed && host.disk.percentUsed > 85 ? 'text-red-400' : 'text-foreground'}`}>{host?.disk?.percentUsed ?? '—'}%</div>
                  <div className="text-xs text-muted-foreground mt-1">{fmtBytesMB(host?.disk?.usedMB)} / {fmtBytesMB(host?.disk?.totalMB)}</div>
                </div>
                <div className="bg-card rounded-lg p-4">
                  <div className="text-xs text-muted-foreground uppercase">{t('admin.monitor.uptime')}</div>
                  <div className="text-2xl font-bold text-foreground mt-1">{fmtUptime(host?.uptime)}</div>
                </div>
                <div className="bg-card rounded-lg p-4">
                  <div className="text-xs text-muted-foreground uppercase">{t('admin.monitor.containers')}</div>
                  <div className="text-2xl font-bold text-foreground mt-1">{host?.containers ?? '—'}</div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="clientes" className="space-y-5">
            {/* ====== RESUMEN CLIENTES ====== */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-lg p-4">
                <div className="text-xs text-muted-foreground uppercase">{t('admin.monitor.radiosOnline')}</div>
                <div className="text-2xl font-bold text-green-400 mt-1">{onlineRadio} / {clients.filter(c => c.hasRadio).length}</div>
              </div>
              <div className="bg-card rounded-lg p-4">
                <div className="text-xs text-muted-foreground uppercase">{t('admin.monitor.videosOnline')}</div>
                <div className="text-2xl font-bold text-green-400 mt-1">{onlineVideo} / {clients.filter(c => c.hasVideo).length}</div>
              </div>
              <div className="bg-card rounded-lg p-4">
                <div className="text-xs text-muted-foreground uppercase">{t('admin.monitor.listeners')}</div>
                <div className="text-2xl font-bold text-brand mt-1">{totalListeners}</div>
              </div>
              <div className="bg-card rounded-lg p-4">
                <div className="text-xs text-muted-foreground uppercase">{t('admin.monitor.viewers')}</div>
                <div className="text-2xl font-bold text-brand mt-1">{totalViewers}</div>
              </div>
            </div>

            {/* ====== TABLA CLIENTES ====== */}
            <div className="bg-card rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-background/50 text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="text-left p-3">{t('admin.monitor.client')}</th>
                    <th className="text-left p-3">{t('admin.monitor.audioServer')}</th>
                    <th className="text-left p-3">{t('admin.monitor.audio')}</th>
                    <th className="text-left p-3">{t('admin.monitor.videoServer')}</th>
                    <th className="text-left p-3">{t('admin.monitor.video')}</th>
                    <th className="text-right p-3">{t('admin.monitor.listeners')}</th>
                    <th className="text-right p-3">{t('admin.monitor.viewers')}</th>
                    <th className="text-right p-3">{t('admin.monitor.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.clientId} className="border-t border-border/50 hover:bg-secondary/20">
                      <td className="p-3">
                        <div className="text-foreground font-medium">{c.clientName}</div>
                        <div className="text-xs text-muted-foreground">{c.email}</div>
                      </td>
                      <td className="p-3">
                        {c.hasRadio ? (
                          <span className={`text-xs font-medium ${c.radioServerOnline ? 'text-brand' : 'text-red-400'}`}>
                            {c.radioServerName || '—'}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3"><StatusBadge status={c.radioStatus} has={c.hasRadio} unavailable={c.hasRadio && !c.radioServerOnline} /></td>
                      <td className="p-3">
                        {c.hasVideo ? (
                          <span className={`text-xs font-medium ${c.videoServerOnline ? 'text-brand' : 'text-red-400'}`}>
                            {c.videoServerName || '—'}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3"><StatusBadge status={c.videoStatus} has={c.hasVideo} unavailable={c.hasVideo && !c.videoServerOnline} /></td>
                      <td className="p-3 text-right text-foreground">{c.listeners}</td>
                      <td className="p-3 text-right text-foreground">{c.viewers}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setMigrateClient({ id: c.clientId, name: c.clientName })}
                          className="text-xs px-2 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          {t('admin.monitor.migrate')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {clients.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">{t('admin.monitor.noClients')}</div>
              )}
            </div>

            <ClientMigrateModal
              clientId={migrateClient?.id || ''}
              clientName={migrateClient?.name || ''}
              open={!!migrateClient}
              onClose={() => setMigrateClient(null)}
              onMigrated={load}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
