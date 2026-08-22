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
  encoder?: { status: string }
}

export default function TvConnectionPage() {
  const [info, setInfo] = useState<StreamInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedRelay, setCopiedRelay] = useState(false)
  const [copiedRelayKey, setCopiedRelayKey] = useState(false)
  const [host, setHost] = useState('panelipstream.cl')
  // La Conexión Universal entra por el app 'relay' de SRS con el mismo stream key.
  const relayServerUrl = `rtmp://${host}:1935/relay`
  const { toast } = useToast()

  useEffect(() => {
    setHost(window.location.hostname)
  }, [])

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
            Conectado desde {new Date(info.dj.connectedAt).toLocaleString('es-CL')}
          </p>
        )}
        <div className="flex items-center gap-2 mt-3">
          <span className={`w-2.5 h-2.5 rounded-full ${info?.status === 'autodj' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className={info?.status === 'autodj' ? 'text-green-300 text-sm font-medium' : 'text-gray-400 text-sm'}>
            {info?.status === 'autodj' ? 'AutoDJ activo' : info?.status === 'off' ? 'AutoDJ detenido' : 'AutoDJ detenido (DJ en vivo)'}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Al conectar tu transmisión, el AutoDJ se detiene automáticamente. Al terminar, se reanuda.
        </p>
      </div>

      {/* Conexión Universal (H.264 estándar; HEVC/AV1 por enhanced RTMP se descartan en ingesta con SRS v5) */}
      {info && (
        <>
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700/40 shadow-xl p-5">
            <h2 className="text-lg font-semibold text-white mb-3">Conexión Universal (H.264)</h2>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-green-300 text-sm font-medium">Relay activo</span>
            </div>
            <div className="flex flex-col md:flex-row gap-2 mb-3">
              <input
                type="text"
                readOnly
                value={relayServerUrl}
                className="flex-1 bg-gray-900 text-cyan-400 px-3 py-2.5 rounded-lg border border-gray-700 font-mono text-sm outline-none"
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                onClick={() => copy(relayServerUrl, setCopiedRelay, 'Servidor Relay')}
                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                {copiedRelay ? '✓ Copiado' : 'Copiar Relay'}
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
                onClick={() => copy(info.streamKey, setCopiedRelayKey, 'Stream Key')}
                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                {copiedRelayKey ? '✓ Copiado' : 'Copiar Key'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Usá esta URL en OBS como Servidor y tu Stream Key en "Clave de stream". Configurá un encoder
              H.264 estándar (x264, NVENC, QuickSync o AMF) y desactivá "Enhanced streaming" (HEVC/AV1): esos
              códecs no se soportan y el video se ve en negro. Con un key incorrecto la conexión es rechazada.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
