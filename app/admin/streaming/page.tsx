'use client'

// =====================================================
// Page — /admin/streaming (lista de clientes con streaming)
// =====================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'

interface ClientStreaming {
  clientId: string
  clientName: string
  email: string
  userName: string | null
  hasRadioStream: boolean
  icecastMount?: string
  status?: string
  bitrate?: number
  enabled?: boolean
  storageQuotaMB?: number | null
  maxListeners?: number | null
  listenerCount?: number
  usage?: {
    totalMB: number
    quotaMB: number | null
    percentUsed: number | null
    remainingMB: number | null
    exceeded: boolean
    trackCount: number
    playlistCount: number
  }
  createdAt: string
}

function fmtMB(mb: number | null | undefined) {
  if (mb === null || mb === undefined) return '∞'
  if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
  return `${mb} MB`
}

export default function AdminStreamingPage() {
  const { toast } = useToast()
  const [clients, setClients] = useState<ClientStreaming[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [showOnlyWith, setShowOnlyWith] = useState(false)
  const [creatingFor, setCreatingFor] = useState<string | null>(null)
  const [togglingFor, setTogglingFor] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/streaming', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const createStream = async (clientId: string, clientName: string) => {
    if (!confirm(`¿Crear RadioStream para "${clientName}"?`)) return
    setCreatingFor(clientId)
    try {
      const res = await fetch(`/api/admin/streaming/${clientId}/create`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Error creando')
      toast({ type: 'success', title: 'RadioStream creado', description: `Mount: /${data.radioStream.icecastMount}` })
      await load()
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', description: err.message })
    } finally {
      setCreatingFor(null)
    }
  }

  const toggleAutodj = async (clientId: string, action: 'start' | 'stop') => {
    setTogglingFor(clientId)
    try {
      const res = await fetch(`/api/admin/streaming/${clientId}/autodj`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Error')
      toast({
        type: 'success',
        title: action === 'start' ? 'AutoDJ iniciado' : 'AutoDJ detenido',
        description: 'Estado actualizado',
      })
      await load()
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', description: err.message })
    } finally {
      setTogglingFor(null)
    }
  }

  const filtered = clients.filter((c) => {
    if (showOnlyWith && !c.hasRadioStream) return false
    if (filter) {
      const q = filter.toLowerCase()
      return c.clientName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.icecastMount || '').toLowerCase().includes(q)
    }
    return true
  })

  const stats = {
    total: clients.length,
    withStream: clients.filter((c) => c.hasRadioStream).length,
    withoutStream: clients.filter((c) => !c.hasRadioStream).length,
    active: clients.filter((c) => c.status === 'autodj' || c.status === 'live').length,
    exceeded: clients.filter((c) => c.usage?.exceeded).length,
    totalStorageMB: clients.reduce((sum, c) => sum + (c.usage?.totalMB || 0), 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Streaming</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configura opciones de streaming y AutoDJ para cada cliente.
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 bg-secondary hover:bg-secondary text-foreground rounded-lg"
        >
          ↻ Refrescar
        </button>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-card rounded-lg p-4">
          <div className="text-xs text-muted-foreground uppercase">Clientes</div>
          <div className="text-2xl font-bold text-foreground mt-1">{stats.total}</div>
        </div>
        <div className="bg-card rounded-lg p-4">
          <div className="text-xs text-muted-foreground uppercase">Con Stream</div>
          <div className="text-2xl font-bold text-brand mt-1">{stats.withStream}</div>
        </div>
        <div className="bg-card rounded-lg p-4">
          <div className="text-xs text-muted-foreground uppercase">Sin Stream</div>
          <div className={`text-2xl font-bold mt-1 ${stats.withoutStream > 0 ? 'text-yellow-400' : 'text-muted-foreground'}`}>
            {stats.withoutStream}
          </div>
        </div>
        <div className="bg-card rounded-lg p-4">
          <div className="text-xs text-muted-foreground uppercase">Activos</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{stats.active}</div>
        </div>
        <div className="bg-card rounded-lg p-4">
          <div className="text-xs text-muted-foreground uppercase">Excedidos</div>
          <div className={`text-2xl font-bold mt-1 ${stats.exceeded > 0 ? 'text-red-400' : 'text-foreground'}`}>
            {stats.exceeded}
          </div>
        </div>
        <div className="bg-card rounded-lg p-4">
          <div className="text-xs text-muted-foreground uppercase">Storage total</div>
          <div className="text-2xl font-bold text-foreground mt-1">{fmtMB(Math.round(stats.totalStorageMB))}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="🔍 Buscar por nombre, email o mount..."
          className="flex-1 bg-card text-foreground px-3 py-2 rounded border border-border"
        />
        <label className="flex items-center gap-2 text-foreground">
          <input
            type="checkbox"
            checked={showOnlyWith}
            onChange={(e) => setShowOnlyWith(e.target.checked)}
            className="rounded"
          />
          Solo con streaming
        </label>
      </div>

      {/* Tabla */}
      <div className="bg-card rounded-lg overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">Sin resultados</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-background/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Mount</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-right p-3">Storage</th>
                <th className="text-right p-3">Tracks</th>
                <th className="text-right p-3">Oyentes</th>
                <th className="text-right p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.clientId} className="border-t border-border/50 hover:bg-secondary/30">
                  <td className="p-3">
                    <div className="text-foreground font-medium">{c.clientName}</div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </td>
                  <td className="p-3 font-mono text-xs text-brand">
                    {c.hasRadioStream ? `/${c.icecastMount}` : '—'}
                  </td>
                  <td className="p-3">
                    {c.hasRadioStream ? (
                      <div className="flex flex-col gap-1">
                        {c.enabled ? (
                          <span className={`text-xs px-2 py-0.5 rounded inline-block w-fit ${
                            c.status === 'autodj' ? 'bg-green-900 text-green-300' :
                            c.status === 'live' ? 'bg-red-900 text-red-300 animate-pulse' :
                            'bg-secondary text-muted-foreground'
                          }`}>
                            {c.status === 'autodj' ? '▶ AutoDJ' : c.status === 'live' ? '🔴 EN VIVO' : '⏸ OFF'}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-900 text-red-300 inline-block w-fit">
                            ⛔ Deshabilitado
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">Sin RadioStream</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {c.usage ? (
                      <div>
                        <div className={`text-sm font-medium ${
                          c.usage.exceeded ? 'text-red-400' :
                          c.usage.percentUsed !== null && c.usage.percentUsed > 80 ? 'text-yellow-400' :
                          'text-foreground'
                        }`}>
                          {fmtMB(c.usage.totalMB)} / {fmtMB(c.usage.quotaMB)}
                        </div>
                        {c.usage.percentUsed !== null && (
                          <div className="w-24 h-1.5 bg-secondary rounded-full mt-1 ml-auto overflow-hidden">
                            <div
                              className={`h-full ${
                                c.usage.exceeded ? 'bg-red-500' :
                                c.usage.percentUsed > 80 ? 'bg-yellow-500' : 'bg-brand'
                              }`}
                              style={{ width: `${Math.min(100, c.usage.percentUsed)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="p-3 text-right text-foreground">
                    {c.usage?.trackCount ?? 0}
                  </td>
                  <td className="p-3 text-right text-foreground">
                    {c.listenerCount ?? 0}
                  </td>
                  <td className="p-3 text-right">
                    {c.hasRadioStream ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleAutodj(c.clientId, c.status === 'autodj' || c.status === 'live' ? 'stop' : 'start')}
                          disabled={togglingFor === c.clientId || c.enabled === false}
                          className={`px-3 py-1.5 disabled:bg-secondary disabled:text-muted-foreground text-foreground text-xs rounded ${
                            c.status === 'autodj' || c.status === 'live'
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {togglingFor === c.clientId
                            ? '...'
                            : c.status === 'autodj' || c.status === 'live'
                              ? '⏹ Detener'
                              : '▶ Iniciar'}
                        </button>
                        <Link
                          href={`/admin/streaming/${c.clientId}`}
                          className="text-brand hover:text-brand text-xs"
                        >
                          Configurar →
                        </Link>
                      </div>
                    ) : (
                      <button
                        onClick={() => createStream(c.clientId, c.clientName)}
                        disabled={creatingFor === c.clientId}
                        className="px-3 py-1.5 bg-brand hover:bg-brand disabled:bg-secondary text-white text-xs rounded"
                      >
                        {creatingFor === c.clientId ? '...' : '+ Crear stream'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
