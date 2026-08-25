'use client'

// =====================================================
// Page — /admin/streaming/[clientId]
// =====================================================

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { ClientMigrateModal } from '@/components/admin/ClientMigrateModal'

interface Usage {
  totalBytes: number
  totalMB: number
  totalGB: number
  trackCount: number
  playlistCount: number
  quotaMB: number | null
  quotaBytes: number | null
  percentUsed: number | null
  remainingMB: number | null
  exceeded: boolean
}

interface ClientData {
  id: string
  name: string
  email: string
  userName: string | null
  createdAt: string
  trackCount: number
  playlistCount: number
}

interface RadioStreamData {
  id: string
  clientId: string
  icecastMount: string
  liquidsoapTelnetPort: number
  bitrate: number
  enabled: boolean
  storageQuotaMB: number | null
  maxListeners: number | null
  maxTracksPerPlaylist: number | null
  adminNotes: string | null
  status: string
  listenerCount: number
  lastStatusAt: string | null
  createdAt: string
  updatedAt: string
}

function fmtMB(mb: number | null | undefined) {
  if (mb === null || mb === undefined) return '∞ (sin límite)'
  if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
  return `${mb} MB`
}

export default function AdminStreamingConfigPage() {
  const { clientId } = useParams() as { clientId: string }
  const router = useRouter()
  const { toast } = useToast()

  const [data, setData] = useState<{ client: ClientData; radioStream: RadioStreamData; usage: Usage } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [revealing, setRevealing] = useState<'live' | 'source' | null>(null)
  const [revealedPwd, setRevealedPwd] = useState<{ live?: string; source?: string }>({})
  const [migrateOpen, setMigrateOpen] = useState(false)

  // Form state
  const [enabled, setEnabled] = useState(true)
  const [autoStart, setAutoStart] = useState(false)
  const [bitrate, setBitrate] = useState(128)
  const [storageQuotaMB, setStorageQuotaMB] = useState<string>('')
  const [maxListeners, setMaxListeners] = useState<string>('')
  const [maxTracksPerPlaylist, setMaxTracksPerPlaylist] = useState<string>('')
  const [adminNotes, setAdminNotes] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/streaming/${clientId}`, { cache: 'no-store' })
      if (res.ok) {
        const d = await res.json()
        setData(d)
        // Init form
        setEnabled(d.radioStream.enabled)
        setAutoStart(d.radioStream.autoStart ?? false)
        setBitrate(d.radioStream.bitrate)
        setStorageQuotaMB(d.radioStream.storageQuotaMB?.toString() ?? '')
        setMaxListeners(d.radioStream.maxListeners?.toString() ?? '')
        setMaxTracksPerPlaylist(d.radioStream.maxTracksPerPlaylist?.toString() ?? '')
        setAdminNotes(d.radioStream.adminNotes || '')
      } else if (res.status === 404) {
        toast({ type: 'error', title: 'Cliente o RadioStream no encontrado' })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [clientId, toast])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    try {
      const payload: any = {
        enabled,
        autoStart,
        bitrate: Number(bitrate),
        storageQuotaMB: storageQuotaMB === '' ? null : Number(storageQuotaMB),
        maxListeners: maxListeners === '' ? null : Number(maxListeners),
        maxTracksPerPlaylist: maxTracksPerPlaylist === '' ? null : Number(maxTracksPerPlaylist),
        adminNotes: adminNotes || null,
      }
      const res = await fetch(`/api/admin/streaming/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.message || result.details?.fieldErrors || 'Error guardando')
      toast({ type: 'success', title: 'Configuración guardada' })
      await load()
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const reveal = async (type: 'live' | 'source') => {
    setRevealing(type)
    try {
      const res = await fetch(`/api/admin/streaming/${clientId}/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Error')
      }
      const data = await res.json()
      setRevealedPwd((prev) => ({ ...prev, [type]: data.password }))
      toast({ type: 'info', title: `Password ${type} revelado`, description: 'Quedó auditado en el log' })
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', description: err.message })
    } finally {
      setRevealing(null)
    }
  }

  if (loading || !data) {
    return <div className="text-gray-400">Cargando...</div>
  }

  const { client, radioStream, usage } = data

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/streaming" className="text-sm text-cyan-400 hover:text-cyan-300">
          ← Volver a Streaming
        </Link>
        <h1 className="text-3xl font-bold text-white mt-1">{client.name}</h1>
        <p className="text-sm text-gray-400">{client.email}</p>
      </div>

      {/* Status card */}
      <div className="bg-gray-800 rounded-lg p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-gray-400 uppercase">Estado</div>
            <div className="text-lg font-semibold mt-1">
              {radioStream.status === 'autodj' ? <span className="text-green-400">▶ AutoDJ</span> :
               radioStream.status === 'live' ? <span className="text-red-400">🔴 EN VIVO</span> :
               <span className="text-gray-400">⏸ OFF</span>}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase">Mount</div>
            <div className="text-sm font-mono text-cyan-400 mt-1">/{radioStream.icecastMount}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase">Oyentes</div>
            <div className="text-lg font-semibold text-white mt-1">{radioStream.listenerCount}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase">Bitrate</div>
            <div className="text-lg font-semibold text-white mt-1">{radioStream.bitrate} kbps</div>
          </div>
        </div>
      </div>

      {/* Storage usage */}
      <div className="bg-gray-800 rounded-lg p-5">
        <h2 className="text-lg font-semibold text-white mb-3">Storage AutoDJ</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-gray-400 uppercase">Usado</div>
            <div className="text-2xl font-bold text-white mt-1">{fmtMB(usage.totalMB)}</div>
            <div className="text-xs text-gray-500 mt-0.5">{usage.totalGB} GB · {usage.trackCount} tracks</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase">Cuota</div>
            <div className="text-2xl font-bold text-white mt-1">{fmtMB(usage.quotaMB)}</div>
            {usage.percentUsed !== null && (
              <div className="text-xs text-gray-500 mt-0.5">{usage.percentUsed}% usado</div>
            )}
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase">Restante</div>
            <div className={`text-2xl font-bold mt-1 ${
              usage.exceeded ? 'text-red-400' :
              usage.remainingMB !== null && usage.remainingMB < 100 ? 'text-yellow-400' :
              'text-green-400'
            }`}>
              {fmtMB(usage.remainingMB)}
            </div>
            {usage.exceeded && (
              <div className="text-xs text-red-400 mt-0.5">⚠ Excedido — bloqueado para uploads</div>
            )}
          </div>
        </div>
        {usage.percentUsed !== null && (
          <div className="mt-4">
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  usage.exceeded ? 'bg-red-500' :
                  usage.percentUsed > 80 ? 'bg-yellow-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(100, usage.percentUsed || 0)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Config form */}
      <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Configuración</h2>

        {/* Enabled kill switch */}
        <div className="flex items-center gap-3 pb-3 border-b border-gray-700">
          <input
            type="checkbox"
            id="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="enabled" className="text-white">
            Streaming habilitado
            <span className="block text-xs text-gray-500">
              Si está deshabilitado, el cliente no puede hacer start/stop ni subir tracks.
            </span>
          </label>
        </div>

        {/* Auto-start toggle */}
        <div className="flex items-center gap-3 pb-3 border-b border-gray-700">
          <input
            type="checkbox"
            id="autoStart"
            checked={autoStart}
            onChange={(e) => setAutoStart(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="autoStart" className="text-white">
            Auto-start al reiniciar
            <span className="block text-xs text-gray-500">
              Inicia automáticamente el AutoDJ cuando el servidor se reinicie.
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-white">Bitrate (kbps)</label>
            <select
              value={bitrate}
              onChange={(e) => setBitrate(Number(e.target.value))}
              className="w-full mt-1 bg-gray-900 text-white px-3 py-2 rounded border border-gray-700"
            >
              <option value={64}>64 kbps (baja calidad)</option>
              <option value={96}>96 kbps</option>
              <option value={128}>128 kbps (estándar)</option>
              <option value={192}>192 kbps (alta)</option>
              <option value={256}>256 kbps (muy alta)</option>
              <option value={320}>320 kbps (máxima)</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-white">Storage quota (MB) — AutoDJ</label>
            <input
              type="number"
              min="0"
              value={storageQuotaMB}
              onChange={(e) => setStorageQuotaMB(e.target.value)}
              placeholder="Vacío = ilimitado"
              className="w-full mt-1 bg-gray-900 text-white px-3 py-2 rounded border border-gray-700"
            />
            <p className="text-xs text-gray-500 mt-1">
              Espacio máximo para biblioteca MP3. 0 o vacío = ilimitado.
              Mínimo recomendado: 500 MB.
            </p>
          </div>
          <div>
            <label className="text-sm text-white">Max oyentes simultáneos</label>
            <input
              type="number"
              min="0"
              value={maxListeners}
              onChange={(e) => setMaxListeners(e.target.value)}
              placeholder="Vacío = ilimitado"
              className="w-full mt-1 bg-gray-900 text-white px-3 py-2 rounded border border-gray-700"
            />
            <p className="text-xs text-gray-500 mt-1">Cap en Icecast. 0 o vacío = ilimitado.</p>
          </div>
          <div>
            <label className="text-sm text-white">Max tracks por playlist</label>
            <input
              type="number"
              min="1"
              value={maxTracksPerPlaylist}
              onChange={(e) => setMaxTracksPerPlaylist(e.target.value)}
              placeholder="Vacío = ilimitado"
              className="w-full mt-1 bg-gray-900 text-white px-3 py-2 rounded border border-gray-700"
            />
            <p className="text-xs text-gray-500 mt-1">Límite al agregar tracks a una playlist. 0 o vacío = ilimitado.</p>
          </div>
        </div>

        <div>
          <label className="text-sm text-white">Notas internas</label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
            placeholder="Notas para el equipo de admin..."
            className="w-full mt-1 bg-gray-900 text-white px-3 py-2 rounded border border-gray-700"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white rounded"
          >
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </button>
          <button
            onClick={() => setMigrateOpen(true)}
            disabled={saving}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded"
          >
            ⇄ Migrar a otro servidor
          </button>
          <button
            onClick={load}
            disabled={saving}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white rounded"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Passwords (solo admin) */}
      <div className="bg-gray-800 rounded-lg p-6 space-y-3">
        <h2 className="text-lg font-semibold text-white">Credenciales (auditado)</h2>
        <p className="text-sm text-gray-400">
          Cada reveal queda registrado en <code className="text-cyan-400">streaming_audit_logs</code>.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-white">Source password (AutoDJ)</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                readOnly
                value={revealedPwd.source || '••••••••'}
                className="flex-1 bg-gray-900 text-cyan-400 px-3 py-2 rounded border border-gray-700 font-mono text-sm"
              />
              <button
                onClick={() => reveal('source')}
                disabled={revealing === 'source'}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 text-white rounded text-sm"
              >
                {revealing === 'source' ? '...' : '👁 Revelar'}
              </button>
              {revealedPwd.source && (
                <button
                  onClick={() => navigator.clipboard.writeText(revealedPwd.source!)}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                >
                  Copiar
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm text-white">Live password (DJ en vivo)</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                readOnly
                value={revealedPwd.live || '••••••••'}
                className="flex-1 bg-gray-900 text-cyan-400 px-3 py-2 rounded border border-gray-700 font-mono text-sm"
              />
              <button
                onClick={() => reveal('live')}
                disabled={revealing === 'live'}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 text-white rounded text-sm"
              >
                {revealing === 'live' ? '...' : '👁 Revelar'}
              </button>
              {revealedPwd.live && (
                <button
                  onClick={() => navigator.clipboard.writeText(revealedPwd.live!)}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                >
                  Copiar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Audit log mini-view */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-3">Auditoría reciente</h2>
        <p className="text-xs text-gray-500">
          Ver todos los logs en <Link href="/admin/logs" className="text-cyan-400 hover:text-cyan-300">Logs de Actividad</Link>
        </p>
      </div>

      <ClientMigrateModal
        clientId={client.id}
        clientName={client.name}
        open={migrateOpen}
        onClose={() => setMigrateOpen(false)}
        onMigrated={load}
      />
    </div>
  )
}
