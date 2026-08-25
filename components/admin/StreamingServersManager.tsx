'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { showToast } from '@/components/ui/toast'
import {
  Plus, Trash2, Pencil, RefreshCw, Radio, MonitorPlay, Wifi, WifiOff, Rocket,
  Loader2, RotateCw, KeyRound, ChevronDown, ChevronUp, Server, Network, Database, ShieldCheck, Music, Clapperboard, Mic,
} from 'lucide-react'
import { ServerFormModal, EditableServer } from './ServerFormModal'
import { ProvisionNodeModal } from './ProvisionNodeModal'

interface ServerRow {
  id: string
  name: string
  type: string
  baseUrl: string
  publicHostname: string
  isActive: boolean
  isHealthy: boolean
  lastHealthAt: string | null
  sshHost: string | null
  sshUser: string | null
  provisionStatus: string
  provisionStep: string | null
  provisionError: string | null
  provisionLog: string[] | null
  provisionedAt: string | null
  _count: { radioStreams: number; videoStreams: number }
}

interface HealthInfo {
  online: boolean
  affectedClients: number
}

const TYPE_ICON: Record<string, typeof Radio> = { radio: Radio, tv: MonitorPlay, both: Server }
const TYPE_LABEL: Record<string, string> = { radio: 'Radio', tv: 'TV', both: 'Radio + TV' }

export function StreamingServersManager() {
  const [servers, setServers] = useState<ServerRow[]>([])
  const [health, setHealth] = useState<Record<string, HealthInfo>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<EditableServer | null>(null)
  const [showProvision, setShowProvision] = useState(false)
  const [showLog, setShowLog] = useState<Record<string, boolean>>({})
  const mountedRef = useRef(true)

  const provisioningActive = servers.some((s) => s.provisionStatus === 'provisioning')

  const load = useCallback(async () => {
    try {
      const [listRes, healthRes] = await Promise.all([
        fetch('/api/admin/servers', { cache: 'no-store' }),
        fetch('/api/admin/servers/health', { cache: 'no-store' }),
      ])
      if (listRes.ok) {
        const data = await listRes.json()
        setServers(data.servers || [])
      }
      if (healthRes.ok) {
        const hdata = await healthRes.json()
        const map: Record<string, HealthInfo> = {}
        for (const s of hdata.servers || []) {
          map[s.server.id] = { online: s.online, affectedClients: s.affectedClients }
        }
        setHealth(map)
      }
    } catch (err) {
      console.error('[servers] load error', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Polling cada 3s mientras haya un provisioning en curso
  useEffect(() => {
    if (!provisioningActive) return
    const id = setInterval(() => {
      if (mountedRef.current) load()
    }, 3000)
    return () => clearInterval(id)
  }, [provisioningActive, load])

  const openCreate = () => {
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (server: ServerRow) => {
    setEditing({ id: server.id, name: server.name, type: server.type, baseUrl: server.baseUrl, publicHostname: server.publicHostname })
    setShowForm(true)
  }

  const retryProvision = async (server: ServerRow) => {
    if (!confirm(`¿Reintentar el provisioning de "${server.name}"?`)) return
    try {
      const res = await fetch(`/api/admin/servers/${server.id}/provision/retry`, { method: 'POST' })
      if (res.ok) {
        showToast({ type: 'success', title: 'Provisioning reiniciado' })
        await load()
      } else {
        const d = await res.json().catch(() => ({}))
        showToast({ type: 'error', title: d?.message || 'Error al reintentar' })
      }
    } catch {
      showToast({ type: 'error', title: 'Error al reintentar' })
    }
  }

  const revokeSsh = async (server: ServerRow) => {
    if (!confirm(`¿Quitar el acceso SSH de "${server.name}"? No podrá re-provisionarse automáticamente.`)) return
    try {
      const res = await fetch(`/api/admin/servers/${server.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revokeSsh: true }),
      })
      if (res.ok) {
        showToast({ type: 'success', title: 'Acceso SSH eliminado' })
        await load()
      } else {
        showToast({ type: 'error', title: 'No se pudo quitar el acceso SSH' })
      }
    } catch {
      showToast({ type: 'error', title: 'Error al quitar acceso SSH' })
    }
  }

  const handleDelete = async (server: ServerRow) => {
    if (!confirm(`¿Dar de baja "${server.name}"?`)) return
    try {
      const res = await fetch(`/api/admin/servers/${server.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        showToast({ type: 'success', title: 'Servidor eliminado' })
        await load()
      } else {
        showToast({ type: 'error', title: data?.message || 'No se pudo eliminar' })
      }
    } catch {
      showToast({ type: 'error', title: 'Error al eliminar' })
    }
  }

  const StatusDot = ({ online }: { online: boolean }) => (
    online ? (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400">
        <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" /> En línea
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400">
        <span className="h-2 w-2 rounded-full bg-red-400" /> Sin respuesta
      </span>
    )
  )

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refrescar
        </Button>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Agregar servidor
        </Button>
        <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setShowProvision(true)}>
          <Rocket className="h-4 w-4 mr-1" /> Provisionar nodo (SSH)
        </Button>
        {provisioningActive && (
          <span className="inline-flex items-center gap-2 text-sm text-blue-300">
            <Loader2 className="h-4 w-4 animate-spin" /> Provisionando...
          </span>
        )}
      </div>

      {/* Guía de puertos y firewall */}
      <Card className="border-cyan-500/20 bg-cyan-500/5">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-cyan-400" />
            <h3 className="font-semibold text-white">Puertos y firewall</h3>
            <span className="text-xs text-gray-400 font-normal">Requisitos de red para que un nodo quede operativo</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg bg-gray-800/70 border border-gray-700 p-4 space-y-2">
              <p className="font-medium text-cyan-300 flex items-center gap-1.5"><Database className="h-4 w-4" /> VPS central (panel)</p>
              <ul className="space-y-1.5 text-gray-300">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 mt-0.5 text-green-400 shrink-0" />
                  <span><code className="text-cyan-400">3307</code> — MySQL (DB central): abrir <b>al IP del nodo</b> para que el agente del nodo lea/escriba la DB.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 mt-0.5 text-green-400 shrink-0" />
                  <span>SSH <code className="text-cyan-400">22</code> saliente (el panel ya se conecta a los nodos para provisionarlos).</span>
                </li>
              </ul>
            </div>
            <div className="rounded-lg bg-gray-800/70 border border-gray-700 p-4 space-y-2">
              <p className="font-medium text-purple-300 flex items-center gap-1.5"><Server className="h-4 w-4" /> Nodo de streaming</p>
              <ul className="space-y-1.5 text-gray-300">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 mt-0.5 text-green-400 shrink-0" />
                  <span><code className="text-cyan-400">4000</code> — agente: abrir <b>solo a la IP del panel</b> (control).</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 mt-0.5 text-green-400 shrink-0" />
                  <span><code className="text-cyan-400">8000</code> — Icecast: oyentes de radio (público).</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clapperboard className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" />
                  <span><code className="text-cyan-400">1935</code> (RTMP) y <code className="text-cyan-400">8080</code> (HLS) — TV, solo si el nodo es <b>TV</b>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Mic className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" />
                  <span><code className="text-cyan-400">22340-22350</code> — harbor (DJs en vivo), solo si el nodo es <b>radio</b>.</span>
                </li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Consejo: usá WireGuard/VPN para el tráfico privado (panel ↔ nodo ↔ MySQL) y exponé solo lo público (8000, 1935, 8080).
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Cargando servidores...
        </div>
      ) : servers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Server className="h-10 w-10 text-gray-600 mb-3" />
            <p className="text-gray-300 font-medium">No hay servidores de streaming registrados</p>
            <p className="text-sm text-gray-500 mt-1 mb-5">
              Agregá uno ya configurado o provisioná un VPS nuevo automáticamente
            </p>
            <div className="flex gap-3">
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" /> Agregar servidor
              </Button>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setShowProvision(true)}>
                <Rocket className="h-4 w-4 mr-1" /> Provisionar nodo
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {servers.map((server) => {
            const h = health[server.id]
            const online = h ? h.online : server.isHealthy
            const isProvisioningNow = server.provisionStatus === 'provisioning'
            const isFailed = server.provisionStatus === 'failed'
            const Icon = TYPE_ICON[server.type] || Server
            const logOpen = showLog[server.id]

            return (
              <Card
                key={server.id}
                className={`border ${isProvisioningNow ? 'border-blue-500/40' : isFailed ? 'border-red-500/30' : 'border-gray-700'}`}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        isProvisioningNow ? 'bg-blue-500/15' : isFailed ? 'bg-red-500/15' : 'bg-cyan-500/15'
                      }`}>
                        <Icon className={`h-5 w-5 ${isProvisioningNow ? 'text-blue-400' : isFailed ? 'text-red-400' : 'text-cyan-400'}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-white leading-tight">{server.name}</p>
                        <p className="text-xs text-gray-400">{TYPE_LABEL[server.type] || server.type}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isProvisioningNow ? (
                        <Badge className="bg-blue-500/15 text-blue-400"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Provisionando</Badge>
                      ) : isFailed ? (
                        <Badge className="bg-red-500/15 text-red-400"><RotateCw className="h-3 w-3 mr-1" /> Falló</Badge>
                      ) : server.provisionStatus === 'done' ? (
                        <Badge className="bg-purple-500/15 text-purple-400"><Rocket className="h-3 w-3 mr-1" /> Nodo</Badge>
                      ) : null}
                      {!isProvisioningNow && <StatusDot online={online} />}
                    </div>
                  </div>

                  {/* Provisioning state */}
                  {isProvisioningNow && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2.5">
                      <p className="text-sm text-blue-300 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" /> {server.provisionStep || 'Provisionando...'}
                      </p>
                    </div>
                  )}
                  {isFailed && server.provisionError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5">
                      <p className="text-xs text-red-300">{server.provisionError}</p>
                    </div>
                  )}

                  {/* Details */}
                  <div className="text-xs text-gray-400 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Agente</span>
                      <span className="font-mono text-cyan-400 truncate pl-3">{server.baseUrl.replace(/^https?:\/\//, '')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Hostname público</span>
                      <span className="font-mono truncate pl-3">{server.publicHostname}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Clientes</span>
                      <span>{server._count.radioStreams} radio · {server._count.videoStreams} TV</span>
                    </div>
                    {server.sshHost && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">SSH</span>
                        <span className="font-mono">{server.sshUser}@{server.sshHost}</span>
                      </div>
                    )}
                    {h && !online && !isProvisioningNow && (
                      <p className="text-red-400 font-medium">{h.affectedClients} clientes afectados</p>
                    )}
                    {!server.isActive && <p className="text-amber-400">Inactivo — no acepta asignaciones</p>}
                  </div>

                  {/* Log */}
                  {server.provisionLog && server.provisionLog.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowLog((p) => ({ ...p, [server.id]: !logOpen }))}
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                      >
                        {logOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />} Log de provisioning
                      </button>
                      {logOpen && (
                        <pre className="mt-1.5 max-h-48 overflow-auto rounded-lg bg-gray-900 border border-gray-700 p-2.5 text-[11px] text-gray-300 font-mono">
                          {server.provisionLog.join('\n')}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-700/60">
                    <Button size="sm" variant="outline" disabled={isProvisioningNow} onClick={() => openEdit(server)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    {isFailed && (
                      <Button size="sm" variant="outline" className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10" onClick={() => retryProvision(server)}>
                        <RotateCw className="h-3.5 w-3.5 mr-1" /> Reintentar
                      </Button>
                    )}
                    {server.sshHost && !isProvisioningNow && (
                      <Button size="sm" variant="outline" className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10" onClick={() => revokeSsh(server)}>
                        <KeyRound className="h-3.5 w-3.5 mr-1" /> Quitar SSH
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-red-400 border-red-500/30 hover:bg-red-500/10" disabled={isProvisioningNow} onClick={() => handleDelete(server)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <ServerFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={load}
        editing={editing}
      />
      <ProvisionNodeModal
        open={showProvision}
        onClose={() => setShowProvision(false)}
        onStarted={load}
      />
    </div>
  )
}
