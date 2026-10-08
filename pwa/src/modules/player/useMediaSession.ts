import { useEffect } from 'react'
import { usePlayer } from './PlayerContext'

interface MediaSessionData {
  title?: string
  artist?: string
  artwork?: string | null
}

export function useMediaSession(
  data: MediaSessionData,
  options: { enabled?: boolean } = {}
) {
  const { play, pause } = usePlayer()
  const enabled = options.enabled ?? true

  useEffect(() => {
    if (!enabled) return
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') {
      return
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: data.title || 'Radio',
      artist: data.artist || '',
      artwork: data.artwork ? [{ src: data.artwork, sizes: '512x512' }] : []
    })
    navigator.mediaSession.setActionHandler('play', play)
    navigator.mediaSession.setActionHandler('pause', pause)

    return () => {
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
    }
  }, [enabled, data.title, data.artist, data.artwork, play, pause])
}
