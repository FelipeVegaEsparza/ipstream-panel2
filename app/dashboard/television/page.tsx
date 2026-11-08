'use client'

import { useState, useEffect, useRef } from 'react'
import Hls from 'hls.js'
import { useToast } from '@/components/ui/toast'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader'

interface VideoStatus {
  status: string
  streamKey: string
  rtmpUrl: string
  hlsUrl: string
  publicHost: string
  publicBase: string
  encoder: { status: string; startedAt: string | null; currentTrack: string | null }
  dj: { active: boolean; streamKey: string | null; connectedAt: string | null }
}

export default function TelevisionPage() {
  const { t } = useDashboardI18n()
  const [videoStatus, setVideoStatus] = useState<VideoStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedHls, setCopiedHls] = useState(false)
  const [copiedStable, setCopiedStable] = useState(false)
  const [copiedPlayer, setCopiedPlayer] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const videoStatusRef = useRef<VideoStatus | null>(null)
  const { toast } = useToast()

  // Base pública del servidor de video asignado al cliente (viene en el status).
  // Si no llega (fallback), se usa NEXT_PUBLIC_STREAM_PUBLIC_URL o la relativa del panel.
  const publicBase = videoStatus?.publicBase || process.env.NEXT_PUBLIC_STREAM_PUBLIC_URL || ''
  // El DJ en vivo se sirve desde SRS (app 'dj'); el AutoDJ desde el stitcher
  // VOD2Live. Ambos cuelgan de la base pública del servidor asignado: en el
  // servidor principal la sirve el panel; en un nodo, la sirve su Caddy.
  const hlsApp = videoStatus?.status === 'live' ? 'dj' : 'vod'
  const hlsUrl = videoStatus?.streamKey
    ? hlsApp === 'dj'
      ? (publicBase ? `${publicBase.replace(/\/$/, '')}/dj/${videoStatus.streamKey}.m3u8` : `/dj/${videoStatus.streamKey}.m3u8`)
      : (publicBase ? `${publicBase.replace(/\/$/, '')}/vod/${videoStatus.streamKey}/live.m3u8` : `/vod/${videoStatus.streamKey}/live.m3u8`)
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
  // Base del servidor asignado (nodo o panel) para las URLs de transmisión.
  const nodeBase = (publicBase || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/+$/, '')
  // URL estable: /tv/<streamKey>.m3u8 siempre muestra lo que esté al aire
  // (AutoDJ o OBS), servida por el servidor asignado.
  const stableUrl = videoStatus?.streamKey && nodeBase
    ? `${nodeBase}/tv/${videoStatus.streamKey}.m3u8`
    : null
  // URL del reproductor público: /tv/<streamKey> abre una página con player
  const playerUrl = videoStatus?.streamKey && nodeBase
    ? `${nodeBase}/tv/${videoStatus.streamKey}`
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
    let currentApp: 'vod' | 'dj' | null = null
    let lastHealthyAt = 0
    let backoff = 0
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    const MAX_BACKOFF = 5000
    const HEALTHY_TIMEOUT = 20000

    const manifestUrl = (app: 'vod' | 'dj') => {
      const key = videoStatusRef.current?.streamKey
      if (!key) return null
      const base = publicBase ? publicBase.replace(/\/$/, '') : ''
      if (app === 'dj') {
        return base ? `${base}/dj/${key}.m3u8` : `/dj/${key}.m3u8`
      }
      return base ? `${base}/vod/${key}/live.m3u8` : `/vod/${key}/live.m3u8`
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

    const desiredApp = (): 'vod' | 'dj' =>
      videoStatusRef.current?.status === 'live' ? 'dj' : 'vod'

    const start = (app: 'vod' | 'dj') => {
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
        liveSyncDurationCount: 4,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
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
          const other: 'vod' | 'dj' = currentApp === 'vod' ? 'dj' : 'vod'
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
    const interval = setInterval(fetchStatus, 15000)
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
        toast({ type: 'success', title: action === 'start' ? t('tv.autodjStarted') : t('tv.autodjStopped') })
        fetchStatus()
      } else {
        const err = await res.json()
        toast({ type: 'error', title: t('tv.error'), description: err.message || err.error })
      }
    } catch (err) {
      toast({ type: 'error', title: t('tv.connectionError') })
    }
  }

  const copyHls = () => {
    if (!displayUrl) return
    navigator.clipboard.writeText(displayUrl)
    setCopiedHls(true)
    toast({ type: 'success', title: t('tv.hlsCopied') })
    setTimeout(() => setCopiedHls(false), 2000)
  }

  const copyStable = () => {
    if (!stableUrl) return
    navigator.clipboard.writeText(stableUrl)
    setCopiedStable(true)
    toast({ type: 'success', title: t('tv.stableCopied') })
    setTimeout(() => setCopiedStable(false), 2000)
  }

  const copyPlayer = () => {
    if (!playerUrl) return
    navigator.clipboard.writeText(playerUrl)
    setCopiedPlayer(true)
    toast({ type: 'success', title: t('tv.playerCopied') })
    setTimeout(() => setCopiedPlayer(false), 2000)
  }

  const isAutoDj = videoStatus?.status === 'autodj'
  const isLive = videoStatus?.status === 'live'
  const isOff = videoStatus?.status === 'off'

  return (
    <div className="space-y-6">
   <DashboardPageHeader title={t('tv.title')} description={t('tv.subtitle')} />

      {/* Status */}
      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isOff
                ? 'bg-[color:var(--text-3)]'
                : isLive
                  ? 'bg-[color:var(--danger)]'
                  : 'bg-[color:var(--live)]'
            }`}
          />
          <span className="text-foreground">
            {isOff ? t('tv.status.stopped') : isLive ? t('tv.status.liveDj') : t('tv.status.autodj')}
          </span>
        </span>
        {videoStatus?.dj.active && (
          <span className="text-muted-foreground">
            {t('tv.djSince', { time: new Date(videoStatus.dj.connectedAt!).toLocaleTimeString('es-CL') })}
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {isOff ? (
          <button onClick={() => doAction('start')} className="btn-primary h-9 text-[13px]">
            {t('tv.startAutodj')}
          </button>
        ) : (
          <button
            onClick={() => doAction('stop')}
            className="rounded-control border border-line px-3 py-2 text-[13px] font-medium text-foreground transition-colors hover:border-[color:var(--danger)]/40 hover:text-danger"
          >
            {t('tv.stop')}
          </button>
        )}
      </div>

      {/* HLS Player */}
      {hlsUrl && (isAutoDj || isLive) && (
        <div className="dashboard-panel p-4">
          <h2 className="mb-3 text-[13px] font-medium text-foreground">{t('tv.preview')}</h2>
          <div className="aspect-video overflow-hidden rounded-[10px] border border-line bg-black">
            <video
              key={hlsApp}
              ref={videoRef}
              className="h-full w-full"
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
        <div className="dashboard-panel space-y-3 p-4">
          <h2 className="text-[13px] font-medium text-foreground">{t('tv.streamUrl')}</h2>

          <div>
            <p className="mb-1.5 text-[11px] text-muted-foreground">{t('tv.stableHint')}</p>
            <div className="flex flex-col gap-2 md:flex-row">
              <input
                type="text"
                readOnly
                value={stableUrl}
                className="dashboard-metric flex-1 rounded-control border border-line bg-surface-2 px-3 py-2 text-[11px] text-foreground outline-none"
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                onClick={copyStable}
                className="rounded-control border border-line px-3 py-2 text-[12px] font-medium text-foreground transition-colors hover:bg-surface-3"
              >
                {copiedStable ? t('tv.copied') : t('tv.copy')}
              </button>
            </div>
          </div>

          {playerUrl && (
            <div>
              <p className="mb-1.5 text-[11px] text-muted-foreground">{t('tv.playerHint')}</p>
              <div className="flex flex-col gap-2 md:flex-row">
                <input
                  type="text"
                  readOnly
                  value={playerUrl}
                  className="dashboard-metric flex-1 rounded-control border border-line bg-surface-2 px-3 py-2 text-[11px] text-foreground outline-none"
                  onClick={(e) => e.currentTarget.select()}
                />
                <a
                  href={playerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary px-3 py-2 text-center text-[12px]"
                >
                  {t('tv.open')}
                </a>
                <button
                  onClick={copyPlayer}
                  className="rounded-control border border-line px-3 py-2 text-[12px] font-medium text-foreground transition-colors hover:bg-surface-3"
                >
                  {copiedPlayer ? t('tv.copied') : t('tv.copy')}
                </button>
              </div>
            </div>
          )}

          {displayUrl && (
            <div>
              <p className="mb-1.5 text-[11px] text-muted-foreground">
                {t('tv.current', { status: isLive ? t('tv.obsLive') : isAutoDj ? t('tv.status.autodj') : t('tv.status.stopped') })}
              </p>
              <div className="flex flex-col gap-2 md:flex-row">
                <input
                  type="text"
                  readOnly
                  value={displayUrl}
                  className="dashboard-metric flex-1 rounded-control border border-line bg-surface-2 px-3 py-2 text-[11px] text-foreground outline-none"
                  onClick={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={copyHls}
                  className="rounded-control border border-line px-3 py-2 text-[12px] font-medium text-foreground transition-colors hover:bg-surface-3"
                >
                  {copiedHls ? t('tv.copied') : t('tv.copy')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Now Playing */}
      <div className="dashboard-panel p-4">
        <h2 className="mb-2 text-[13px] font-medium text-foreground">{t('tv.nowOnScreen')}</h2>
        {isLive ? (
          <p className="inline-flex items-center gap-1.5 text-[13px] font-medium text-live">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--live)]" />
            {t('tv.liveFromObs')}
          </p>
        ) : isAutoDj ? (
          <p className="text-[12px] text-muted-foreground">
            {videoStatus?.encoder.currentTrack
              ? t('tv.playingTrack', { track: videoStatus.encoder.currentTrack })
              : t('tv.playing')}
          </p>
        ) : (
          <p className="text-[12px] italic text-muted-foreground">{t('tv.streamStopped')}</p>
        )}
      </div>
    </div>
  )
}
