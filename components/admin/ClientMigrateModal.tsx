'use client'

import { useState, useEffect } from 'react'
import { showToast } from '@/components/ui/toast'
import { X, ArrowRightLeft, Radio, MonitorPlay, AlertTriangle } from 'lucide-react'

interface MigrateOptions {
  client: { id: string; name: string }
  radioServerId: string | null
  videoServerId: string | null
  hasRadio: boolean
  hasVideo: boolean
  servers: { id: string; name: string; type: string }[]
  canMigrate: boolean
}

interface ClientMigrateModalProps {
  clientId: string
  clientName: string
  open: boolean
  onClose: () => void
  onMigrated?: () => void
}

const TYPE_LABEL: Record<string, string> = { radio: 'Radio', tv: 'TV', both: 'Radio+TV' }

export function ClientMigrateModal({ clientId, clientName, open, onClose, onMigrated }: ClientMigrateModalProps) {
  const [options, setOptions] = useState<MigrateOptions | null>(null)
  const [services, setServices] = useState<string[]>([])
  const [targetServerId, setTargetServerId] = useState('')
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setOptions(null)
    setServices([])
    setTargetServerId('')
    setRunning(false)
    setProgress('')
    setError(null)
    fetch(`/api/admin/clients/${clientId}/migrate`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setOptions(d)
        const available: string[] = []
        if (d.hasRadio) available.push('radio')
        if (d.hasVideo) available.push('video')
        setServices(available)
      })
      .catch(() => setError('No se pudo cargar la información del cliente'))
  }, [open, clientId])

  const serverName = (id: string | null) => {
    if (!id) return '—'
    return options?.servers.find((s) => s.id === id)?.name || 'Servidor desconocido'
  }

  const targetOptions = options?.servers || []

  const toggleService = (s: string) => {
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  const run = async () => {
    if (!targetServerId) {
      setError('Elegí un servidor destino')
      return
    }
    if (services.length === 0) {
      setError('Elegí al menos un servicio (radio y/o TV)')
      return
    }
    if (!confirm('La migración detiene el stream en el origen y lo inicia en el destino. ¿Continuar?')) return

    setRunning(true)
    setError(null)
    setProgress('Copiando archivos de biblioteca al destino...')
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services, targetServerId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || data?.error || 'Error en la migración')
      }
      setProgress('')
      showToast({ type: 'success', title: 'Migración completada', description: `${data.copied ?? 0} archivos copiados` })
      onMigrated?.()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error en la migración')
      setProgress('')
    } finally {
      setRunning(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-cyan-400" /> Migrar {clientName}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!options ? (
          <div className="text-gray-400 py-6 text-center">{error || 'Cargando...'}</div>
        ) : !options.canMigrate ? (
          <div className="text-gray-400 py-6 text-center">
            Este cliente no tiene streams de radio ni de TV para migrar.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="text-sm text-gray-400">
              Servidor actual de radio: <span className="text-cyan-400">{serverName(options.radioServerId)}</span>
              <br />
              Servidor actual de TV: <span className="text-cyan-400">{serverName(options.videoServerId)}</span>
            </div>

            <div>
              <p className="text-sm text-white font-medium mb-2">Servicios a migrar</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={services.includes('radio')}
                    disabled={!options.hasRadio}
                    onChange={() => toggleService('radio')}
                    className="rounded"
                  />
                  <Radio className="h-4 w-4 text-cyan-400" /> Radio {!options.hasRadio && '(no tiene)'}
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={services.includes('video')}
                    disabled={!options.hasVideo}
                    onChange={() => toggleService('video')}
                    className="rounded"
                  />
                  <MonitorPlay className="h-4 w-4 text-cyan-400" /> TV {!options.hasVideo && '(no tiene)'}
                </label>
              </div>
            </div>

            <div>
              <p className="text-sm text-white font-medium mb-2">Servidor destino</p>
              <select
                value={targetServerId}
                onChange={(e) => setTargetServerId(e.target.value)}
                className="w-full form-input"
              >
                <option value="">Seleccionar servidor...</option>
                {targetOptions.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === options.radioServerId && s.id === options.videoServerId}>
                    {s.name} ({TYPE_LABEL[s.type] || s.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-start gap-2 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Habrá un breve corte y el DJ que transmita en vivo deberá reconectar con el nuevo host.
                La migración es manual: el panel nunca mueve clientes automáticamente.
              </span>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
            {progress && <p className="text-sm text-cyan-300">{progress}...</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={onClose} disabled={running} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm">
                Cancelar
              </button>
              <button
                onClick={run}
                disabled={running}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white rounded text-sm"
              >
                {running ? 'Migrando...' : 'Migrar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
