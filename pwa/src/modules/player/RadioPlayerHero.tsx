import { useEffect } from 'react'
import { firstPublicImageUrl } from '@/core/api'
import { useTenant } from '@/core/config/TenantContext'
import { useStreaming } from '@/core/hooks/useStreaming'
import type { FullClientData } from '@/core/types'
import { SmartImage } from '@/ui'
import { NextTrack } from './NextTrack'
import { usePlayer } from './PlayerContext'
import { TrackProgress } from './TrackProgress'
import { useMediaSession } from './useMediaSession'
import styles from './RadioPlayerHero.module.css'

interface RadioPlayerHeroProps {
  clientData: FullClientData | undefined
}

export function RadioPlayerHero({ clientData }: RadioPlayerHeroProps) {
  const tenant = useTenant()
  const { setStreamUrl, isPlaying, toggle } = usePlayer()
  const { data: streaming } = useStreaming(tenant.clientId ?? '')

  const basic = clientData?.basicData
  const streamUrl = basic?.radioStreamingUrl ?? null
  const currentTrack = streaming?.currentTrack
  const trackCover = currentTrack?.coverUrl ?? null
  const trackKey =
    trackCover ?? `${currentTrack?.title ?? ''}|${currentTrack?.artist ?? ''}`

  useEffect(() => {
    if (streamUrl) setStreamUrl(streamUrl)
  }, [streamUrl, setStreamUrl])

  const artwork = firstPublicImageUrl([
    trackCover,
    basic?.coverUrl,
    basic?.logoUrl
  ])
  const status = streaming?.status ?? 'off'
  const isLive = streaming?.isLive ?? false
  const name = basic?.projectName ?? tenant.clientId ?? 'IPStream'

  useMediaSession({
    title: currentTrack?.title,
    artist: currentTrack?.artist,
    artwork
  })

  return (
    <section className={styles.hero}>
      <SmartImage
        className={styles.cover}
        src={trackCover}
        fallbacks={[basic?.coverUrl, basic?.logoUrl]}
        alt=""
      />
      <div className={styles.info}>
        <p className={styles.status}>
          {status === 'off'
            ? 'Fuera del aire'
            : isLive
              ? '● EN VIVO'
              : 'En el aire'}
        </p>
        <h2 className={styles.track}>
          {currentTrack?.title ?? 'Sintoniza nuestra señal'}
        </h2>
        <p className={styles.artist}>{currentTrack?.artist ?? name}</p>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.play}
            onClick={toggle}
            disabled={!streamUrl}
          >
            {isPlaying ? 'Pausar' : 'Reproducir'}
          </button>
          <span className={styles.listeners}>
            {streaming?.listeners ?? 0} oyentes
          </span>
        </div>
        <TrackProgress
          duration={currentTrack?.duration}
          trackKey={trackKey}
          isPlaying={isPlaying}
          serverElapsed={currentTrack?.elapsed}
        />
        <NextTrack next={streaming?.nextTrack} fallbackCover={basic?.coverUrl} />
      </div>
    </section>
  )
}
