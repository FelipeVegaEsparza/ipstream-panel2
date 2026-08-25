'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { showToast } from '@/components/ui/toast'
import { Plus, Trash2, Pencil, RefreshCw, Server, Radio, MonitorPlay, Wifi, WifiOff, X, Rocket, Loader2, RotateCw, KeyRound, ChevronDown, ChevronUp } from 'lucide-react'

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
  provisionStartedAt: string | null
  provisionedAt: string | null
  _count: { radioStreams: number; videoStreams: number }
}

interface HealthInfo {
  online: boolean
  affectedClients: number
}

const EMPTY_MANUAL = { name: '', type: 'both', baseUrl: '', token: '', publicHostname: '' }
const EMPTY_PROVISION = {
  name: '',
  type: 'both',
  publicHostname: '',
  sshHost: '',
  sshPort: '22',
  sshUser: 'root',
  sshAuthType: 'key',
  sshPrivateKey: '',
  sshPassword: '',
}

export function StreamingServersManager() {
  const [servers, setServers] = useState<ServerRow[]>([])
  const [health, setHealth] = useState<Record<string, HealthInfo>>({})
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'manual' | 'provision' | null>(null)
  const [editing, setEditing] = useState<ServerRow | null>(null)
  const [manualForm, setManualForm] = useState(EMPTY_MANUAL)
  const [provForm, setProvForm] = useState(EMPTY_PROVISION)
  const [saving, setSaving] = useState(false)
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

  const resetForm = () => {
    setMode(null)
    setEditing(null)
    setManualForm(EMPTY_MANUAL)
    setProvForm(EMPTY_PROVISION)
  }

  const handleSaveManual = async (isEdit: boolean) => {
    if (!manualForm.name.trim() || !manualForm.baseUrl.trim() || !manualForm.publicHostname.trim()) {
      showToast({ type: 'error', title: 'Completá nombre, URL del agente y hostname público' })
      return
    }
    if (!isEdit && !manualForm.token.trim()) {
      showToast({ type: 'error', title: 'El token es requerido al crear un servidor' })
      return
    }
    setSaving(true)
    try {
      const url = isEdit && editing ? `/api/admin/servers/${editing.id}` : '/api/admin/servers'
      const method = isEdit ? 'PATCH' : 'POST'
      const body: any = { ...manualForm }
      if (isEdit && !body.token) delete body.token
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        showToast({ type: 'success', title: isEdit ? 'Servidor actualizado' : 'Servidor creado' })
        resetForm()
        await load()
      } else {
        showToast({ type: 'error', title: data?.message || data?.error || 'Error al guardar' })
      }
    } catch {
      showToast({ type: 'error', title: 'Error al guardar' })
    } finally {
      setSaving(false)
    }
  }

  const handleProvision = async () => {
    const f = provForm
    if (!f.name.trim() || !f.publicHostname.trim() || !f.sshHost.trim()) {
      showToast({ type: 'error', title: 'Completá nombre, hostname público y host SSH' })
      return
    }
    if (f.sshAuthType === 'key' && !f.sshPrivateKey.trim()) {
      showToast({ type: 'error', title: 'Pegá la clave privada SSH' })
      return
    }
    if (f.sshAuthType === 'password' && !f.sshPassword.trim()) {
      showToast({ type: 'error', title: 'Ingresá el password SSH' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/servers/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.name,
          type: f.type,
          publicHostname: f.publicHostname,
          sshHost: f.sshHost,
          sshPort: Number(f.sshPort || 22),
          sshUser: f.sshUser || 'root',
          sshAuthType: f.sshAuthType,
          sshPrivateKey: f.sshAuthType === 'key' ? f.sshPrivateKey : undefined,
          sshPassword: f.sshAuthType === 'password' ? f.sshPassword : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        showToast({ type: 'success', title: 'Provisioning iniciado', description: 'Se ejecutará en segundo plano' })
        resetForm()
        await load()
      } else {
        showToast({ type: 'error', title: data?.message || data?.error || 'Error al iniciar provisioning' })
      }
    } catch {
      showToast({ type: 'error', title: 'Error al iniciar provisioning' })
    } finally {
      setSaving(false)
    }
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

  const startEdit = (server: ServerRow) => {
    setEditing(server)
    setMode('manual')
    setManualForm({
      name: server.name,
      type: server.type,
      baseUrl: server.baseUrl,
      token: '',
      publicHostname: server.publicHostname,
    })
  }

  const typeLabel = (t: string) => t === 'radio' ? 'Radio' : t === 'tv' ? 'TV' : 'Radio + TV'

  const provBadge = (s: ServerRow) => {
    if (s.provisionStatus === 'provisioning') {
      return <Badge className="bg-blue-500/15 text-blue-400"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Provisionando</Badge>
    }
    if (s.provisionStatus === 'failed') {
      return <Badge className="bg-red-500/15 text-red-400"><RotateCw className="h-3 w-3 mr-1" /> Falló</Badge>
    }
    if (s.provisionStatus === 'done') {
      return <Badge className="bg-green-500/15 text-green-400"><Rocket className="h-3 w-3 mr-1" /> Nodo</Badge>
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refrescar
        </Button>
        {!mode && !editing && (
          <>
            <Button size="sm" onClick={() => setMode('manual')}>
              <Plus className="h-4 w-4 mr-1" /> Agregar servidor (manual)
            </Button>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => setMode('provision')}>
              <Rocket className="h-4 w-4 mr-1" /> Provisionar nodo (SSH)
            </Button>
          </>
        )}
      </div>

      {mode === 'manual' && (
        <Card className="border-cyan-500/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editing ? `Editar: ${editing.name}` : 'Nuevo servidor (manual)'}</CardTitle>
            <Button variant="ghost" size="sm" onClick={resetForm}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-gray-300">Nombre</span>
              <input className="input" value={manualForm.name} onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} placeholder="Radio VPS 1" />
            </label>
            <label className="block">
              <span className="text-sm text-gray-300">Tipo</span>
              <select className="input" value={manualForm.type} onChange={(e) => setManualForm({ ...manualForm, type: e.target.value })}>
                <option value="both">Radio + TV</option>
                <option value="radio">Solo Radio</option>
                <option value="tv">Solo TV</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-gray-300">URL del agente</span>
              <input className="input" value={manualForm.baseUrl} onChange={(e) => setManualForm({ ...manualForm, baseUrl: e.target.value })} placeholder="http://node1.example.com:4000" />
            </label>
            <label className="block">
              <span className="text-sm text-gray-300">Hostname público</span>
              <input className="input" value={manualForm.publicHostname} onChange={(e) => setManualForm({ ...manualForm, publicHostname: e.target.value })} placeholder="stream1.example.com" />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm text-gray-300">Token del agente {editing && '(dejar vacío para no cambiar)'}</span>
              <input className="input" type="password" value={manualForm.token} onChange={(e) => setManualForm({ ...manualForm, token: e.target.value })} placeholder="token del STREAMING_AGENT_TOKEN" />
            </label>
            <div className="md:col-span-2 flex gap-2">
              <Button size="sm" disabled={saving} onClick={() => handleSaveManual(!!editing)}>
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear servidor'}
              </Button>
              <Button size="sm" variant="outline" onClick={resetForm}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === 'provision' && (
        <Card className="border-purple-500/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              <span className="flex items-center gap-2"><Rocket className="h-5 w-5 text-purple-400" /> Provisionar nodo de streaming</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={resetForm}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-400 bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
              El panel se conectará por SSH al VPS nuevo y hará todo: instalar Docker, subir el código,
              escribir el .env y levantar el stack. La clave SSH se guarda encriptada.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-gray-300">Nombre del servidor</span>
                <input className="input" value={provForm.name} onChange={(e) => setProvForm({ ...provForm, name: e.target.value })} placeholder="Radio VPS 1" />
              </label>
              <label className="block">
                <span className="text-sm text-gray-300">Tipo</span>
                <select className="input" value={provForm.type} onChange={(e) => setProvForm({ ...provForm, type: e.target.value })}>
                  <option value="both">Radio + TV</option>
                  <option value="radio">Solo Radio</option>
                  <option value="tv">Solo TV</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-gray-300">Hostname público (oyentes)</span>
                <input className="input" value={provForm.publicHostname} onChange={(e) => setProvForm({ ...provForm, publicHostname: e.target.value })} placeholder="radio1.midominio.cl" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-sm text-gray-300">Host SSH (IP)</span>
                  <input className="input" value={provForm.sshHost} onChange={(e) => setProvForm({ ...provForm, sshHost: e.target.value })} placeholder="1.2.3.4" />
                </label>
                <label className="block">
                  <span className="text-sm text-gray-300">Puerto</span>
                  <input className="input" type="number" value={provForm.sshPort} onChange={(e) => setProvForm({ ...provForm, sshPort: e.target.value })} />
                </label>
              </div>
              <label className="block">
                <span className="text-sm text-gray-300">Usuario SSH</span>
                <input className="input" value={provForm.sshUser} onChange={(e) => setProvForm({ ...provForm, sshUser: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-sm text-gray-300">Autenticación</span>
                <select className="input" value={provForm.sshAuthType} onChange={(e) => setProvForm({ ...provForm, sshAuthType: e.target.value })}>
                  <option value="key">Clave privada</option>
                  <option value="password">Password</option>
                </select>
              </label>
              {provForm.sshAuthType === 'key' ? (
                <label className="block md:col-span-2">
                  <span className="text-sm text-gray-300 flex items-center gap-1"><KeyRound className="h-3.5 w-3.5" /> Clave privada SSH (con cabecera -----BEGIN...) </span>
                  <textarea
                    className="input font-mono text-xs h-32"
                    value={provForm.sshPrivateKey}
                    onChange={(e) => setProvForm({ ...provForm, sshPrivateKey: e.target.value })}
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----"
                  />
                </label>
              ) : (
                <label className="block md:col-span-2">
                  <span className="text-sm text-gray-300">Password SSH</span>
                  <input className="input" type="password" value={provForm.sshPassword} onChange={(e) => setProvForm({ ...provForm, sshPassword: e.target.value })} />
                </label>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700" disabled={saving} onClick={handleProvision}>
                {saving ? 'Iniciando...' : 'Provisionar nodo'}
              </Button>
              <Button size="sm" variant="outline" onClick={resetForm}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-gray-400 py-8 text-center">Cargando servidores...</div>
      ) : servers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10 text-gray-400">
            No hay servidores de streaming registrados. Agregá uno manualmente o provisioná un VPS nuevo.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {servers.map((server) => {
            const h = health[server.id]
            const online = h ? h.online : server.isHealthy
            const isProvisioningNow = server.provisionStatus === 'provisioning'
            const logOpen = showLog[server.id]
            return (
              <Card key={server.id} className={`border-gray-700 ${isProvisioningNow ? 'border-blue-500/40' : ''}`}>
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {server.type === 'tv' ? <MonitorPlay className="h-5 w-5 text-cyan-400" /> : <Radio className="h-5 w-5 text-cyan-400" />}
                      <div>
                        <p className="font-semibold text-white">{server.name}</p>
                        <p className="text-xs text-gray-400">{typeLabel(server.type)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {provBadge(server)}
                      {!isProvisioningNow && (online ? (
                        <Badge className="bg-green-500/15 text-green-400"><Wifi className="h-3 w-3 mr-1" /> En línea</Badge>
                      ) : (
                        <Badge className="bg-red-500/15 text-red-400"><WifiOff className="h-3 w-3 mr-1" /> Caído</Badge>
                      ))}
                    </div>
                  </div>

                  {isProvisioningNow && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <p className="text-sm text-blue-300 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> {server.provisionStep || 'Provisionando...'}
                      </p>
                    </div>
                  )}
                  {server.provisionStatus === 'failed' && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <p className="text-xs text-red-300">{server.provisionError}</p>
                    </div>
                  )}

                  <div className="text-xs text-gray-400 space-y-1">
                    <p><span className="text-gray-500">Agente:</span> {server.baseUrl}</p>
                    <p><span className="text-gray-500">Hostname público:</span> {server.publicHostname}</p>
                    <p><span className="text-gray-500">Clientes:</span> {server._count.radioStreams} radio · {server._count.videoStreams} TV</p>
                    {server.sshHost && <p><span className="text-gray-500">SSH:</span> {server.sshUser}@{server.sshHost}</p>}
                    {h && !online && !isProvisioningNow && (
                      <p className="text-red-400">{h.affectedClients} clientes afectados</p>
                    )}
                    {!server.isActive && <p className="text-amber-400">Inactivo</p>}
                  </div>

                  {server.provisionLog && server.provisionLog.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowLog((p) => ({ ...p, [server.id]: !logOpen }))}
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                      >
                        {logOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />} Log de provisioning
                      </button>
                      {logOpen && (
                        <pre className="mt-1 max-h-48 overflow-auto bg-gray-900 rounded p-2 text-[11px] text-gray-300 font-mono">
                          {server.provisionLog.join('\n')}
                        </pre>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" disabled={isProvisioningNow} onClick={() => startEdit(server)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    {server.provisionStatus === 'failed' && (
                      <Button size="sm" variant="outline" className="text-blue-400" onClick={() => retryProvision(server)}>
                        <RotateCw className="h-3.5 w-3.5 mr-1" /> Reintentar
                      </Button>
                    )}
                    {server.sshHost && server.provisionStatus !== 'provisioning' && (
                      <Button size="sm" variant="outline" className="text-amber-400" onClick={() => revokeSsh(server)}>
                        <KeyRound className="h-3.5 w-3.5 mr-1" /> Quitar SSH
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-red-400" disabled={isProvisioningNow} onClick={() => handleDelete(server)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
