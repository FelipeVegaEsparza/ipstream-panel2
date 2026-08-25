'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { showToast } from '@/components/ui/toast'
import { Plus, Trash2, Pencil, RefreshCw, Server, Radio, MonitorPlay, Wifi, WifiOff, X } from 'lucide-react'

interface ServerRow {
  id: string
  name: string
  type: string
  baseUrl: string
  publicHostname: string
  isActive: boolean
  isHealthy: boolean
  lastHealthAt: string | null
  _count: { radioStreams: number; videoStreams: number }
}

interface HealthInfo {
  online: boolean
  affectedClients: number
}

const EMPTY_FORM = { name: '', type: 'both', baseUrl: '', token: '', publicHostname: '' }

export function StreamingServersManager() {
  const [servers, setServers] = useState<ServerRow[]>([])
  const [health, setHealth] = useState<Record<string, HealthInfo>>({})
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ServerRow | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const [listRes, healthRes] = await Promise.all([
        fetch('/api/admin/servers'),
        fetch('/api/admin/servers/health'),
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

  const handleSave = async (isEdit: boolean) => {
    if (!form.name.trim() || !form.baseUrl.trim() || !form.publicHostname.trim()) {
      showToast({ type: 'error', title: 'Completá nombre, URL del agente y hostname público' })
      return
    }
    if (!isEdit && !form.token.trim()) {
      showToast({ type: 'error', title: 'El token es requerido al crear un servidor' })
      return
    }
    setSaving(true)
    try {
      const url = isEdit && editing ? `/api/admin/servers/${editing.id}` : '/api/admin/servers'
      const method = isEdit ? 'PATCH' : 'POST'
      const body: any = { ...form }
      if (isEdit && !body.token) delete body.token
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        showToast({ type: 'success', title: isEdit ? 'Servidor actualizado' : 'Servidor creado' })
        setForm(EMPTY_FORM)
        setCreating(false)
        setEditing(null)
        await load()
      } else {
        showToast({ type: 'error', title: data?.message || data?.error || 'Error al guardar' })
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Error al guardar' })
    } finally {
      setSaving(false)
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
    setCreating(false)
    setForm({
      name: server.name,
      type: server.type,
      baseUrl: server.baseUrl,
      token: '',
      publicHostname: server.publicHostname,
    })
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setCreating(false)
    setEditing(null)
  }

  const typeLabel = (t: string) => t === 'radio' ? 'Radio' : t === 'tv' ? 'TV' : 'Radio + TV'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refrescar
          </Button>
          {!creating && !editing && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-1" /> Agregar servidor
            </Button>
          )}
        </div>
      </div>

      {(creating || editing) && (
        <Card className="border-cyan-500/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editing ? `Editar: ${editing.name}` : 'Nuevo servidor de streaming'}</CardTitle>
            <Button variant="ghost" size="sm" onClick={resetForm}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-gray-300">Nombre</span>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Radio VPS 1" />
            </label>
            <label className="block">
              <span className="text-sm text-gray-300">Tipo</span>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="both">Radio + TV</option>
                <option value="radio">Solo Radio</option>
                <option value="tv">Solo TV</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-gray-300">URL del agente</span>
              <input className="input" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="http://node1.example.com:4000" />
            </label>
            <label className="block">
              <span className="text-sm text-gray-300">Hostname público</span>
              <input className="input" value={form.publicHostname} onChange={(e) => setForm({ ...form, publicHostname: e.target.value })} placeholder="stream1.example.com" />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm text-gray-300">Token del agente {editing && '(dejar vacío para no cambiar)'}</span>
              <input className="input" type="password" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} placeholder="token del STREAMING_AGENT_TOKEN" />
            </label>
            <div className="md:col-span-2 flex gap-2">
              <Button size="sm" disabled={saving} onClick={() => handleSave(!!editing)}>
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear servidor'}
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
            No hay servidores de streaming registrados. Agregá el primero para asignar clientes.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {servers.map((server) => {
            const h = health[server.id]
            const online = h ? h.online : server.isHealthy
            return (
              <Card key={server.id} className="border-gray-700">
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {server.type === 'tv' ? <MonitorPlay className="h-5 w-5 text-cyan-400" /> : <Radio className="h-5 w-5 text-cyan-400" />}
                      <div>
                        <p className="font-semibold text-white">{server.name}</p>
                        <p className="text-xs text-gray-400">{typeLabel(server.type)}</p>
                      </div>
                    </div>
                    {online ? (
                      <Badge className="bg-green-500/15 text-green-400"><Wifi className="h-3 w-3 mr-1" /> En línea</Badge>
                    ) : (
                      <Badge className="bg-red-500/15 text-red-400"><WifiOff className="h-3 w-3 mr-1" /> Caído</Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 space-y-1">
                    <p><span className="text-gray-500">Agente:</span> {server.baseUrl}</p>
                    <p><span className="text-gray-500">Hostname público:</span> {server.publicHostname}</p>
                    <p><span className="text-gray-500">Clientes:</span> {server._count.radioStreams} radio · {server._count.videoStreams} TV</p>
                    {h && !online && (
                      <p className="text-red-400">{h.affectedClients} clientes afectados</p>
                    )}
                    {!server.isActive && (
                      <p className="text-amber-400">Inactivo (no acepta asignaciones)</p>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => startEdit(server)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-400" onClick={() => handleDelete(server)}>
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
