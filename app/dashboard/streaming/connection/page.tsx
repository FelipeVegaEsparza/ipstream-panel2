'use client'

import { useEffect, useState, useCallback } from 'react'
import { useStreamingStatus } from '@/lib/useStreamingStatus'

interface DjSlotInfo {
  id: string
  name: string
  mount: string
  priority: number
  role: string
  isActive: boolean
  connected: boolean
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Dueño — interrumpe a todos',
  host: 'Locutor — interrumpido por owner, interrumpe a guest',
  guest: 'Invitado — solo si nadie más conectó',
}

export default function ConnectionPage() {
  const { status } = useStreamingStatus({ pollingMs: 10000 })
  const [copyText, setCopyText] = useState<string | null>(null)

  const [connectionInfo, setConnectionInfo] = useState<{
    host: string
    port: number
    mount: string
    harborHost: string
    harborPort: number | null
    harborMount: string
  } | null>(null)
  const [livePassword, setLivePassword] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [djSlots, setDjSlots] = useState<DjSlotInfo[]>([])
  const [djConnected, setDjConnected] = useState(false)
  const [selectedMount, setSelectedMount] = useState('/live')

  useEffect(() => {
    fetch('/api/dashboard/streaming/connection')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.host) {
          setConnectionInfo(data)
        }
      })
      .catch(() => {})
  }, [])

  // Poll DJ status + slots
  useEffect(() => {
    const poll = () => {
      fetch('/api/dashboard/streaming/connection')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            setDjConnected(data.djConnected || false)
            if (data.djSlots) setDjSlots(data.djSlots)
          }
        })
        .catch(() => {})
    }
    poll()
    const iv = setInterval(poll, 10000)
    return () => clearInterval(iv)
  }, [])

  const harborHost = connectionInfo?.harborHost || (typeof window !== 'undefined' ? window.location.hostname : 'localhost')
  const harborPort = connectionInfo?.harborPort || 9000
  const mount = connectionInfo?.mount || status?.mount || 'mi-mount'

  const revealPassword = useCallback(async (djMount?: string) => {
    // Si hay DJs configurados, mostrar info del slot seleccionado
    if (djSlots.length > 0 && djMount) {
      // Por ahora revela el livePassword general; los passwords individuales
      // se muestran en la página de gestión de DJs
    }
    if (livePassword) {
      setShowPassword(prev => !prev)
      return
    }
    setLoadingPassword(true)
    try {
      const res = await fetch('/api/dashboard/streaming/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revealPassword: 'live' }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setLivePassword(data.password)
      setShowPassword(true)
    } catch {
      // silent fail
    } finally {
      setLoadingPassword(false)
    }
  }, [livePassword, djSlots])

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopyText(label)
    setTimeout(() => setCopyText(null), 2000)
  }

  const connectedSlot = djSlots.find(s => s.connected)
  const displayPassword = showPassword && livePassword ? livePassword : '********'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Conexión DJ</h1>
        <p className="mt-1 text-sm text-gray-400">
          Datos para transmitir en vivo con BUTT, MIXXX u otro software DJ.
          Si configuraste varios DJs, cada uno tiene su propio mount y password.
        </p>
      </div>

      {/* DJ status indicator */}
      <div className={`rounded-lg p-4 text-sm border ${
        djConnected
          ? 'bg-green-900/30 border-green-700 text-green-100'
          : 'bg-gray-800 border-gray-700 text-gray-300'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`inline-block w-3 h-3 rounded-full ${
            djConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
          }`} />
          <span className={djConnected ? 'text-green-400' : 'text-cyan-400'}>
            {djConnected ? `DJ en vivo${connectedSlot ? ` (${connectedSlot.name})` : ''}` : 'AutoDJ activo'}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          {djConnected
            ? 'DJ conectado. El AutoDJ se reanudará automáticamente al desconectar.'
            : 'No hay DJ conectado. Configurá tu encoder con los datos de abajo.'}
        </p>
      </div>

      {/* DJ Slots */}
      {djSlots.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Slots de DJ disponibles</h2>
          <p className="text-xs text-gray-400 -mt-2">
            Cada DJ usa un mountpoint y password diferente. Conectate al que te corresponda.
          </p>

          <div className="space-y-3">
            {djSlots.map((slot) => (
              <div key={slot.id} className={`border rounded-lg p-3 ${
                slot.connected
                  ? 'border-green-700 bg-green-900/20'
                  : slot.isActive
                    ? 'border-gray-700 bg-gray-900/50'
                    : 'border-gray-700 bg-gray-900/50 opacity-50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${slot.connected ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
                    <span className="text-white font-medium">{slot.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded uppercase ${
                      slot.role === 'owner' ? 'bg-red-900/50 text-red-300' :
                      slot.role === 'host' ? 'bg-blue-900/50 text-blue-300' :
                      'bg-gray-700 text-gray-300'
                    }`}>{slot.role}</span>
                    {slot.connected && <span className="text-xs text-green-400">Conectado</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Mount</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <code className="bg-gray-900 text-cyan-400 px-2 py-1 rounded flex-1 font-mono">{slot.mount}</code>
                      <button onClick={() => copy(slot.mount, 'Mount')} className="px-1.5 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded">Copiar</button>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Prioridad</span>
                    <div className="mt-0.5 text-white">{slot.priority}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Rol</span>
                    <div className="mt-0.5 text-gray-300">{ROLE_LABELS[slot.role] || slot.role}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Estado</span>
                    <div className="mt-0.5">{slot.isActive ? (slot.connected ? 'En vivo' : 'Disponible') : 'Inactivo'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Server info */}
      <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Configuración del servidor</h2>
        <p className="text-xs text-gray-400 -mt-2">
          Datos comunes para todos los DJs. Cambiá solo el mount y password según tu slot.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 uppercase">Servidor (Liquidsoap)</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-gray-900 text-cyan-400 px-3 py-2 rounded flex-1 font-mono text-sm">
                {harborHost}
              </code>
              <button onClick={() => copy(harborHost, 'Servidor')} className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded">
                Copiar
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase">Puerto (Harbor)</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-gray-900 text-cyan-400 px-3 py-2 rounded flex-1 font-mono text-sm">
                {harborPort}
              </code>
              <button onClick={() => copy(String(harborPort), 'Puerto')} className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded">
                Copiar
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase">Usuario</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-gray-900 text-cyan-400 px-3 py-2 rounded flex-1 font-mono text-sm">
                source
              </code>
              <button onClick={() => copy('source', 'Usuario')} className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded">
                Copiar
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase">Password (legacy)</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-gray-900 text-cyan-400 px-3 py-2 rounded flex-1 font-mono text-sm">
                {displayPassword}
              </code>
              <button
                onClick={() => revealPassword()}
                disabled={loadingPassword}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded"
                title={showPassword ? 'Ocultar' : 'Mostrar'}
              >
                {loadingPassword ? '...' : showPassword ? '🙈' : '👁'}
              </button>
              {livePassword && showPassword && (
                <button onClick={() => copy(livePassword, 'Password')} className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded">
                  Copiar
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Password por defecto. Si tenés DJs configurados, cada uno tiene su propio password.
            </p>
          </div>
        </div>
      </div>

      {/* BUTT example */}
      <div className="bg-gray-800 rounded-lg p-6 space-y-3">
        <h2 className="text-lg font-semibold text-white">Configuración en BUTT (ejemplo)</h2>
        <ol className="text-sm text-gray-300 space-y-2 list-decimal pl-5">
          <li>Abrí BUTT → Settings → Stream</li>
          <li>Server type: <code className="text-cyan-400">Icecast 2</code></li>
          <li>Address: <code className="text-cyan-400">{harborHost}</code></li>
          <li>Port: <code className="text-cyan-400">{harborPort}</code></li>
          <li>Mount: <code className="text-cyan-400">/dj1</code> (o el de tu slot)</li>
          <li>Username: <code className="text-cyan-400">source</code></li>
          <li>Password: tu password DJ individual</li>
          <li>Click <strong>Add</strong> y luego <strong>Play</strong></li>
        </ol>
      </div>

      {copyText && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg">
          {'\u2713'} {copyText} copiado
        </div>
      )}
    </div>
  )
}
