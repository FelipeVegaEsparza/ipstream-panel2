'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/toast'

interface DjStatus {
  active: boolean
  streamKey: string | null
  connectedAt: string | null
}

interface StreamInfo {
  streamKey: string
  rtmpUrl: string
  relayUrl: string | null
  status: string
  dj: DjStatus
}

export default function TvConnectionPage() {
  const [info, setInfo] = useState<StreamInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedRtmp, setCopiedRtmp] = useState(false)
  const [copiedRelay, setCopiedRelay] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const serverUrl = 'rtmp://localhost:1935/live'
  const relayUrl = 'rtmp://127.0.0.1:1936/live/relay'
  const { toast } = useToast()

  useEffect(() => {
    fetchInfo()
    const interval = setInterval(fetchInfo, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchInfo = async () => {
    try {
      const res = await fetch('/api/dashboard/television/status')
      if (res.ok) {
        const data = await res.json()
        setInfo(data)
      }
    } catch (_) {
    } finally {
      setLoading(false)
    }
  }

  const copy = (text: string, setter: (v: boolean) => void, label: string) => {
    navigator.clipboard.writeText(text)
    setter(true)
    toast({ type: 'success', title: `${label} copiado` })
    setTimeout(() => setter(false), 2000)
  }

  if (loading) return <div className="text-gray-400 p-6">Cargando...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Conexión OBS</h1>
        <p className="mt-1 text-sm text-gray-400">
          Usá estos datos para conectar OBS Studio a tu canal de Televisión
        </p>
      </div>

      {/* DJ Status */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700/40 shadow-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-3">Estado del DJ</h2>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${info?.dj.active ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className={info?.dj.active ? 'text-red-300 font-medium' : 'text-gray-400'}>
            {info?.dj.active ? 'Transmitiendo en vivo' : 'Sin DJ conectado'}
          </span>
        </div>
        {info?.dj.active && info.dj.connectedAt && (
          <p className="text-xs text-gray-500 mt-1">
            Conectado desde {new Date(info.dj.connectedAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* RTMP URL */}
      {info && (
        <>
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700/40 shadow-xl p-5">
            <h2 className="text-lg font-semibold text-white mb-3">Servidor RTMP</h2>
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="text"
                readOnly
                value={serverUrl}
                className="flex-1 bg-gray-900 text-cyan-400 px-3 py-2.5 rounded-lg border border-gray-700 font-mono text-sm outline-none"
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                onClick={() => copy(serverUrl, setCopiedRtmp, 'URL RTMP')}
                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                {copiedRtmp ? '✓ Copiado' : 'Copiar RTMP'}
              </button>
            </div>
          </div>

          {/* Relay URL (compatible con OBS enhanced RTMP) */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700/40 shadow-xl p-5">
            <h2 className="text-lg font-semibold text-white mb-3">Conexión Universal (cualquier codec)</h2>
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="text"
                readOnly
                value={`rtmp://127.0.0.1:1936/live/relay`}
                className="flex-1 bg-gray-900 text-cyan-400 px-3 py-2.5 rounded-lg border border-gray-700 font-mono text-sm outline-none"
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                onClick={() => copy(`rtmp://127.0.0.1:1936/live/relay`, setCopiedRelay, 'URL Relay')}
                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                {copiedRelay ? '✓ Copiado' : 'Copiar Relay'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Usá esta URL en OBS como Servidor. Acepta cualquier códec (H.265, AV1, enhanced RTMP). No necesita Stream Key.
            </p>
          </div>

          {/* Stream Key */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700/40 shadow-xl p-5">
            <h2 className="text-lg font-semibold text-white mb-3">Conexión Directa</h2>
            <p className="text-xs text-gray-400 mb-3">Usá solo si OBS está configurado con H.264 y enhanced RTMP desactivado.</p>
            <div className="flex flex-col md:flex-row gap-2 mb-3">
              <input
                type="text"
                readOnly
                value={serverUrl}
                className="flex-1 bg-gray-900 text-cyan-400 px-3 py-2.5 rounded-lg border border-gray-700 font-mono text-sm outline-none"
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                onClick={() => copy(serverUrl, setCopiedRtmp, 'URL RTMP')}
                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                {copiedRtmp ? '✓ Copiado' : 'Copiar RTMP'}
              </button>
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="text"
                readOnly
                value={info.streamKey}
                className="flex-1 bg-gray-900 text-cyan-400 px-3 py-2.5 rounded-lg border border-gray-700 font-mono text-sm outline-none"
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                onClick={() => copy(info.streamKey, setCopiedKey, 'Stream Key')}
                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                {copiedKey ? '✓ Copiado' : 'Copiar Key'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
