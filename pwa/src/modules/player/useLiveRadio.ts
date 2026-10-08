import { useEffect } from 'react'
import { firstPublicImageUrl } from '@/core/api'
import { useTenant } from '@/core/config/TenantContext'
import { useStreaming } from '@/core/hooks/useStreaming'
import type { BasicData, FullClientData, StreamingTrack } from '@/core/types'
import { usePlayer } from './PlayerContext'
import { useMediaSession } from './useMediaSession'

export interface LiveRadio {
  basic: BasicData | null | undefined
  name: string
  streamUrl: string | null
  currentTrack: StreamingTrack | null | undefined
  nextTrack: StreamingTrack | null | undefined
  trackCover: string | null | undefined
  trackKey: string
  artwork: string | null
  fallbacks: Array<string | null | undefined>
  status: 'off' | 'autodj' | 'live'
  isLive: boolean
  listeners: number
  bitrate: number | null
  isPlaying: boolean
  corsCapable: boolean
  toggle: () => void
}

/**
 * Lógica compartida de "radio en vivo" para los templates: expone el stream,
 * el tema actual/siguiente, artwork y controles de reproducción, y mantiene
 * sincronizada la sesión de medios del dispositivo.
 */
export function useLiveRadio(
  clientData: FullClientData | undefined,
  options: { enabled?: boolean } = {}
): LiveRadio {
  const tenant = useTenant()
  const enabled = options.enabled ?? true
  const { data: streaming } = useStreaming(tenant.clientId ?? '', { enabled })
  const { isPlaying, toggle, setStreamUrl, corsCapable } = usePlayer()

  const basic = clientData?.basicData
  const streamUrl = basic?.radioStreamingUrl ?? null
  const currentTrack = streaming?.currentTrack
  const nextTrack = streaming?.nextTrack
  const trackCover = currentTrack?.coverUrl ?? null
  const trackKey =
    trackCover ?? `${currentTrack?.title ?? ''}|${currentTrack?.artist ?? ''}`
  const fallbacks = [basic?.coverUrl, basic?.logoUrl]
  const artwork = firstPublicImageUrl([trackCover, ...fallbacks])
  const status = streaming?.status ?? 'off'
  const name = basic?.projectName ?? tenant.clientId ?? 'IPStream'

  useEffect(() => {
    if (streamUrl) setStreamUrl(streamUrl)
  }, [streamUrl, setStreamUrl])

  useMediaSession(
    {
      title: currentTrack?.title,
      artist: currentTrack?.artist,
      artwork
    },
    { enabled }
  )

  return {
    basic,
    name,
    streamUrl,
    currentTrack,
    nextTrack,
    trackCover,
    trackKey,
    artwork,
    fallbacks,
    status,
    isLive: streaming?.isLive ?? false,
    listeners: streaming?.listeners ?? 0,
    bitrate: streaming?.bitrate ?? null,
    isPlaying,
    corsCapable,
    toggle
  }
}
