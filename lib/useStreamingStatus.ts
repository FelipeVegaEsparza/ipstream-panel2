'use client'

// =====================================================
// useStreamingStatus — hook para el estado en vivo del stream
// =====================================================
// Usa polling cada N segundos. Se podría migrar a WebSocket
// cuando el agent exponga un WS accesible desde el browser
// (requiere Nginx proxy o custom server).

import { useEffect, useRef, useState, useCallback } from 'react'

export interface NowPlayingTrack {
  title: string
  artist?: string | null
  album?: string | null
  duration?: number | null
}

export interface NowPlayingData {
  playlist: {
    id: string
    name: string
    shuffle: boolean
    repeat: boolean
    trackCount: number
  } | null
  currentTrack: NowPlayingTrack | null
  nextTrack: NowPlayingTrack | null
  position: { index: number; total: number } | null
}

export interface StreamStatus {
  hasRadioStream: boolean
  clientId: string
  mount?: string
  streamUrl?: string
  clientName?: string
  nowPlaying?: NowPlayingData
  process?: { running: boolean; pid: number | null }
  icecast?: {
    listenurl?: string
    listeners?: number
    listener_peak?: number
    bitrate?: number
    title?: string
    server_name?: string
    stream_start_iso8600?: string
  } | null
  db?: {
    status?: string
    bitrate?: number
    liquidsoapRunning?: boolean
    lastError?: string | null
  }
  timestamp?: string
}

interface UseStreamingStatusOptions {
  /** Refrescar al montar (default true) */
  fetchOnMount?: boolean
  /** Polling cada N ms (default 5000) */
  pollingMs?: number
}

export function useStreamingStatus(options: UseStreamingStatusOptions = {}) {
  const { fetchOnMount = true, pollingMs = 5000 } = options
  const [status, setStatus] = useState<StreamStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/streaming/status', { cache: 'no-store' })
      if (!res.ok) {
        if (res.status === 404) {
          setStatus({ hasRadioStream: false, clientId: '' })
          setLoading(false)
          setError(null)
          return
        }
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      setStatus(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (fetchOnMount) fetchStatus()
    pollingRef.current = setInterval(fetchStatus, pollingMs)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [fetchOnMount, fetchStatus, pollingMs])

  const refresh = useCallback(() => {
    setLoading(true)
    return fetchStatus()
  }, [fetchStatus])

  return { status, loading, error, refresh }
}
