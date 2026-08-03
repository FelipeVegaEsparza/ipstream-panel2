'use client'

import { useState, useEffect, useRef } from 'react'
import Hls from 'hls.js'
import { useToast } from '@/components/ui/toast'

interface VideoStatus {
  status: string
  streamKey: string
  rtmpUrl: string
  hlsUrl: string
  encoder: { status: string; startedAt: string | null; currentTrack: string | null }
  dj: { active: boolean; streamKey: string | null; connectedAt: string | null }
}

export default function TelevisionPage() {
  const [videoStatus, setVideoStatus] = useState<VideoStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedHls, setCopiedHls] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const { toast } = useToast()
  const [origin, setOrigin] = useState<string | null>(null)

  useEffect(() => {
    setOrigin(`${window.location.protocol}//${window.location.host}`)
  }, [])

  const hlsUrl = videoStatus?.streamKey && origin
    ? `${origin}/live/${videoStatus.streamKey}.m3u8`
    : null

  useEffect(() => {
    if (!videoRef.current || !hlsUrl) return
    if (!Hls.isSupported()) return

    if (hlsRef.current) {
      hlsRef.current.destroy()
    }

    const hls = new Hls()
    hlsRef.current = hls
    hls.loadSource(hlsUrl)
    hls.attachMedia(videoRef.current)

    return () => {
      hls.destroy()
      hlsRef.current = null
    }
  }, [hlsUrl])

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/dashboard/television/status')
      if (res.ok) {
        const data = await res.json()
        setVideoStatus(data)
      }
    } catch (err) {
      console.error('[television] status error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 8000)
    return () => clearInterval(interval)
  }, [])

  const doAction = async (action: 'start' | 'stop') => {
    try {
      const res = await fetch('/api/dashboard/television/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        toast({ type: 'success', title: action === 'start' ? 'AutoDJ iniciado' : 'AutoDJ detenido' })
        fetchStatus()
      } else {
        const err = await res.json()
        toast({ type: 'error', title: 'Error', description: err.message || err.error })
      }
    } catch (err) {
      toast({ type: 'error', title: 'Error de conexión' })
    }
  }

  const copyHls = () => {
    if (!hlsUrl) return
    navigator.clipboard.writeText(hlsUrl)
    setCopiedHls(true)
    toast({ type: 'success', title: 'URL HLS copiada' })
    setTimeout(() => setCopiedHls(false), 2000)
  }

  const isAutoDj = videoStatus?.status === 'autodj'
  const isLive = videoStatus?.status === 'live'
  const isOff = videoStatus?.status === 'off'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Televisión</h1>
        <p className="mt-1 text-sm text-gray-400">
          Transmisión de video en vivo — AutoDJ 24/7
        </p>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
          isOff ? 'bg-gray-700 text-gray-400' :
          isLive ? 'bg-red-900/60 text-red-300 border border-red-500/40' :
          'bg-green-900/60 text-green-300 border border-green-500/40'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            isOff ? 'bg-gray-500' :
            isLive ? 'bg-red-500 animate-pulse' :
            'bg-green-500 animate-pulse'
          }`} />
          {isOff ? 'Detenido' : isLive ? 'EN VIVO (DJ)' : 'AutoDJ'}
        </span>
        {videoStatus?.dj.active && (
          <span className="text-xs text-red-300">
            DJ conectado desde {new Date(videoStatus.dj.connectedAt!).toLocaleTimeString('es-CL')}
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        {isOff ? (
          <button onClick={() => doAction('start')} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors">
            ▶ Iniciar AutoDJ
          </button>
        ) : (
          <button onClick={() => doAction('stop')} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors">
            ■ Detener
          </button>
        )}
      </div>

      {/* HLS Player */}
      {hlsUrl && (isAutoDj || isLive) && (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700/40 shadow-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-3">Vista previa</h2>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full"
              controls
              autoPlay
              muted
              playsInline
            />
          </div>
          <div className="mt-3 flex flex-col md:flex-row gap-2">
            <input
              type="text"
              readOnly
              value={hlsUrl || ''}
              className="flex-1 bg-gray-900 text-cyan-400 px-3 py-2.5 rounded-lg border border-gray-700 font-mono text-sm outline-none"
              onClick={(e) => e.currentTarget.select()}
            />
            <button onClick={copyHls} className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm">
              {copiedHls ? '✓ Copiado' : 'Copiar URL HLS'}
            </button>
          </div>
        </div>
      )}

      {/* Now Playing */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700/40 shadow-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-2">Ahora en pantalla</h2>
        {isLive ? (
          <p className="text-cyan-400 font-medium">Transmisión en vivo desde OBS</p>
        ) : isAutoDj ? (
          <p className="text-gray-400">
            {videoStatus?.encoder.currentTrack
              ? `Reproduciendo: ${videoStatus.encoder.currentTrack}`
              : 'Reproduciendo...'}
          </p>
        ) : (
          <p className="text-gray-500 italic">Stream detenido</p>
        )}
      </div>
    </div>
  )
}
