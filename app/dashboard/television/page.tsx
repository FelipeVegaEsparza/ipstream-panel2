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
  const [copiedStable, setCopiedStable] = useState(false)
  const [copiedPlayer, setCopiedPlayer] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const videoStatusRef = useRef<VideoStatus | null>(null)
  const { toast } = useToast()

  const publicBase = process.env.NEXT_PUBLIC_STREAM_PUBLIC_URL || ''
  // El DJ en vivo se sirve desde el app 'dj'; el AutoDJ desde 'live'.
  const hlsApp = videoStatus?.status === 'live' ? 'dj' : 'live'
  const hlsUrl = videoStatus?.streamKey
    ? publicBase
      ? `${publicBase.replace(/\/$/, '')}/${hlsApp}/${videoStatus.streamKey}.m3u8`
      : `/${hlsApp}/${videoStatus.streamKey}.m3u8`
    : null
  // Link completo para mostrar/copiar: si la URL es relativa, la volvemos
  // absoluta con el dominio actual del navegador.
  const displayUrl = hlsUrl
    ? /^https?:\/\//.test(hlsUrl)
      ? hlsUrl
      : typeof window !== 'undefined'
        ? `${window.location.origin}${hlsUrl}`
        : hlsUrl
    : null
  // URL estable: /tv/<streamKey>.m3u8 siempre muestra lo que esté al aire
  // (AutoDJ o OBS), redirige según el estado.
  const stableUrl = videoStatus?.streamKey
    ? typeof window !== 'undefined'
      ? `${window.location.origin}/tv/${videoStatus.streamKey}.m3u8`
      : null
    : null
  // URL del reproductor público: /tv/<streamKey> abre una página con player
  const playerUrl = videoStatus?.streamKey
    ? typeof window !== 'undefined'
      ? `${window.location.origin}/tv/${videoStatus.streamKey}`
      : null
    : null

  useEffect(() => {
    videoStatusRef.current = videoStatus
  }, [videoStatus])

  // Controlador robusto del player:
  //  - Nunca abandona: ante error fatal reintenta con backoff acotado (máx 5s).
  //  - Sigue el estado (DJ -> app 'dj', AutoDJ -> app 'live') vía videoStatusRef.
  //  - Si lleva >20s sin reproducir, verifica qué app tiene stream REAL (probe
  //    del m3u8: 200 y sin #EXT-X-ENDLIST) y cae al que esté vivo (cubre estado
  //    desactualizado en DB o encoder caído).
  // Se recrea cuando cambia hlsUrl (cambio de app / on/off) y se auto-cura por
  // dentro sin depender de que cambie la URL.
  useEffect(() => {
    if (!videoRef.current || !Hls.isSupported()) return

    let hls: Hls | null = null
    let disposed = false
    let currentApp: 'live' | 'dj' | null = null
    let lastHealthyAt = 0
    let backoff = 0
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    const MAX_BACKOFF = 5000
    const HEALTHY_TIMEOUT = 20000

    const manifestUrl = (app: 'live' | 'dj') => {
      const key = videoStatusRef.current?.streamKey
      if (!key) return null
      return publicBase
        ? `${publicBase.replace(/\/$/, '')}/${app}/${key}.m3u8`
        : `/${app}/${key}.m3u8`
    }

    const probe = async (url: string | null): Promise<boolean> => {
      if (!url) return false
      try {
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) return false
        const txt = await res.text()
        return !txt.includes('#EXT-X-ENDLIST')
      } catch {
        return false
      }
    }

    const desiredApp = (): 'live' | 'dj' =>
      videoStatusRef.current?.status === 'live' ? 'dj' : 'live'

    const start = (app: 'live' | 'dj') => {
      if (disposed || !videoRef.current) return
      if (retryTimer) {
        clearTimeout(retryTimer)
        retryTimer = null
      }
      const url = manifestUrl(app)
      if (!url) return
      if (hls) {
        hls.destroy()
        hls = null
      }
      videoRef.current.removeAttribute('src')
      videoRef.current.load()
      currentApp = app
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
      })
      hlsRef.current = hls
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        lastHealthyAt = Date.now()
        backoff = 0
      })
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal || disposed) return
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR || data.type === Hls.ErrorTypes.OTHER_ERROR) {
          backoff = Math.min(backoff ? backoff * 2 : 800, MAX_BACKOFF)
          console.error('[HLS] reintentando nueva instancia en', backoff, 'ms')
          retryTimer = setTimeout(() => start(currentApp!), backoff)
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls?.recoverMediaError()
        }
      })
      hls.attachMedia(videoRef.current)
      hls.loadSource(url)
      videoRef.current.play().catch(() => {})
    }

    const tick = async () => {
      if (disposed) return
      const desired = desiredApp()
      if (currentApp === null) {
        start(desired)
      } else if (desired !== currentApp) {
        start(desired)
      } else if (Date.now() - lastHealthyAt >= HEALTHY_TIMEOUT) {
        const selfLive = await probe(manifestUrl(currentApp))
        if (selfLive) {
          start(currentApp)
        } else {
          const other: 'live' | 'dj' = currentApp === 'live' ? 'dj' : 'live'
          const otherLive = await probe(manifestUrl(other))
          if (otherLive) start(other)
        }
      }
    }

    tick()
    const interval = setInterval(tick, 5000)

    return () => {
      disposed = true
      if (retryTimer) clearTimeout(retryTimer)
      if (hls) hls.destroy()
      hlsRef.current = null
    }
  }, [hlsUrl, publicBase])

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
    const interval = setInterval(fetchStatus, 5000)
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
    if (!displayUrl) return
    navigator.clipboard.writeText(displayUrl)
    setCopiedHls(true)
    toast({ type: 'success', title: 'URL HLS copiada' })
    setTimeout(() => setCopiedHls(false), 2000)
  }

  const copyStable = () => {
    if (!stableUrl) return
    navigator.clipboard.writeText(stableUrl)
    setCopiedStable(true)
    toast({ type: 'success', title: 'URL estable copiada' })
    setTimeout(() => setCopiedStable(false), 2000)
  }

  const copyPlayer = () => {
    if (!playerUrl) return
    navigator.clipboard.writeText(playerUrl)
    setCopiedPlayer(true)
    toast({ type: 'success', title: 'URL del reproductor copiada' })
    setTimeout(() => setCopiedPlayer(false), 2000)
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
              key={hlsApp}
              ref={videoRef}
              className="w-full h-full"
              controls
              autoPlay
              muted
              playsInline
            />
          </div>
        </div>
      )}

      {/* URLs de transmisión */}
      {stableUrl && (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700/40 shadow-xl p-5 space-y-3">
          <h2 className="text-lg font-semibold text-white mb-1">URL de transmisión</h2>

          <div>
            <p className="text-xs text-gray-400 mb-1.5">
              Estable (muestra AutoDJ u OBS según lo que esté al aire)
            </p>
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="text"
                readOnly
                value={stableUrl}
                className="flex-1 bg-gray-900 text-cyan-400 px-3 py-2.5 rounded-lg border border-gray-700 font-mono text-sm outline-none"
                onClick={(e) => e.currentTarget.select()}
              />
              <button onClick={copyStable} className="px-4 py-2.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg transition-colors text-sm">
                {copiedStable ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          {playerUrl && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5">
                Reproductor (abre una página para ver lo que esté al aire)
              </p>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  type="text"
                  readOnly
                  value={playerUrl}
                  className="flex-1 bg-gray-900 text-cyan-400 px-3 py-2.5 rounded-lg border border-gray-700 font-mono text-sm outline-none"
                  onClick={(e) => e.currentTarget.select()}
                />
                <a
                  href={playerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-green-700 hover:bg-green-600 text-white rounded-lg transition-colors text-sm text-center"
                >
                  Abrir
                </a>
                <button onClick={copyPlayer} className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm">
                  {copiedPlayer ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          )}

          {displayUrl && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5">
                Actual ({isLive ? 'OBS en vivo' : isAutoDj ? 'AutoDJ' : 'Detenido'})
              </p>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  type="text"
                  readOnly
                  value={displayUrl}
                  className="flex-1 bg-gray-900 text-cyan-400 px-3 py-2.5 rounded-lg border border-gray-700 font-mono text-sm outline-none"
                  onClick={(e) => e.currentTarget.select()}
                />
                <button onClick={copyHls} className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm">
                  {copiedHls ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          )}
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
