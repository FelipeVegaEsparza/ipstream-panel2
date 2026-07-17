'use client'

// =====================================================
// StreamingPlayer — player público embebible
// =====================================================
// Para usar en el sitio del cliente: importa este componente y dale el clientId.
// Llama al endpoint público /api/public/[clientId]/streaming/status.

import { useEffect, useRef, useState } from 'react'

interface PublicStatus {
  clientId: string
  clientName: string
  mount: string
  bitrate: number
  status: 'autodj' | 'live' | 'off' | string
  isLive: boolean
  listeners: number
  listenerPeak: number
  currentTitle?: string | null
  currentArtist?: string | null
  streamUrls: { http: string }
  lastUpdate?: string
}

interface Props {
  clientId: string
  /** Color del botón principal. Default 'cyan'. */
  theme?: 'cyan' | 'red' | 'green' | 'purple'
  /** Auto-play al cargar. Default false. */
  autoPlay?: boolean
  /** Mostrar metadata (título, oyentes). Default true. */
  showMetadata?: boolean
  /** className extra para el wrapper. */
  className?: string
}

const COLORS = {
  cyan: 'bg-cyan-600 hover:bg-cyan-700',
  red: 'bg-red-600 hover:bg-red-700',
  green: 'bg-green-600 hover:bg-green-700',
  purple: 'bg-purple-600 hover:bg-purple-700',
}

const STATUS_COLORS: Record<string, string> = {
  autodj: 'bg-green-500',
  live: 'bg-red-500 animate-pulse',
  off: 'bg-gray-500',
}

export function StreamingPlayer({
  clientId,
  theme = 'cyan',
  autoPlay = false,
  showMetadata = true,
  className = '',
}: Props) {
  const [status, setStatus] = useState<PublicStatus | null>(null)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/public/${encodeURIComponent(clientId)}/streaming/status`, { cache: 'no-store' })
      if (!res.ok) {
        if (res.status === 404) {
          setError('Cliente no encontrado')
        }
        return
      }
      const data = await res.json()
      setStatus(data)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    intervalRef.current = setInterval(fetchStatus, 10000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [clientId])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio || !status?.streamUrls?.http) return
    if (playing) {
      audio.pause()
    } else {
      audio.play().catch((e) => setError('Click para reproducir (autoplay bloqueado)'))
    }
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onError = () => setError('Error de reproducción')
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('error', onError)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('error', onError)
    }
  }, [status?.streamUrls?.http])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  // Auto-play on first interaction
  useEffect(() => {
    if (autoPlay && status?.streamUrls?.http && audioRef.current) {
      audioRef.current.play().catch(() => {})
    }
  }, [autoPlay, status?.streamUrls?.http])

  const color = COLORS[theme]
  const statusColor = STATUS_COLORS[status?.status || 'off'] || 'bg-gray-500'

  return (
    <div className={`bg-gray-900 rounded-xl p-5 text-white shadow-xl ${className}`}>
      {status?.streamUrls?.http && (
        <audio
          ref={audioRef}
          src={status.streamUrls.http}
          preload="none"
          crossOrigin="anonymous"
        />
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          disabled={loading || !!error}
          className={`${color} disabled:bg-gray-700 text-white rounded-full w-14 h-14 flex items-center justify-center text-xl transition shadow-lg flex-shrink-0`}
          aria-label={playing ? 'Pausar' : 'Reproducir'}
        >
          {loading ? '⏳' : playing ? '⏸' : '▶'}
        </button>
        <div className="flex-1 min-w-0">
          {showMetadata && status && (
            <>
              <div className="font-semibold truncate flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${statusColor}`}></span>
                {status.clientName}
              </div>
              <div className="text-sm text-gray-400 truncate">
                {status.currentTitle || (status.isLive ? 'En vivo' : 'Fuera del aire')}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {status.listeners} oyente{status.listeners !== 1 ? 's' : ''}
                {status.bitrate && ` · ${status.bitrate} kbps`}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <span className="text-xs text-gray-500">🔊</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="flex-1"
        />
      </div>

      {error && (
        <div className="text-xs text-red-400 mt-2">{error}</div>
      )}
    </div>
  )
}
