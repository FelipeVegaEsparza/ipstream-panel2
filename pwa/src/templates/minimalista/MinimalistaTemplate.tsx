import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { firstPublicImageUrl } from '@/core/api'
import { getTvStreamUrl, useServiceMode } from '@/core/service'
import { useTenant } from '@/core/config/TenantContext'
import { useStreaming } from '@/core/hooks/useStreaming'
import type { TemplateProps } from '../index'
import { InstallPrompt } from '@/modules/pwa/InstallPrompt'
import { NextTrack } from '@/modules/player/NextTrack'
import { useMediaSession } from '@/modules/player/useMediaSession'
import { usePlayer } from '@/modules/player/PlayerContext'
import { useTrackProgress } from '@/modules/player/useTrackProgress'
import { VuMeter } from '@/modules/player/VuMeter'
import { ShareButton } from '@/modules/share/ShareButton'
import { BrandIcon, getSocialLinks } from '@/modules/social/brand'
import { GcBar } from '@/modules/content/GcBar'
import { TvPlayer } from '@/modules/tv/TvPlayer'
import { Weather } from '@/modules/weather/Weather'
import { DigitalClock, SmartImage } from '@/ui'
import styles from './MinimalistaTemplate.module.css'

export function MinimalistaTemplate({ clientData, isLoading }: TemplateProps) {
  const tenant = useTenant()
  const { setStreamUrl, isPlaying, toggle } = usePlayer()
  const radioEnabled = useServiceMode(clientData) !== 'tv'
  const { data: streaming } = useStreaming(tenant.clientId ?? '', {
    enabled: radioEnabled
  })
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  const basic = clientData?.basicData
  const name = basic?.projectName ?? tenant.clientId ?? 'IPStream'
  const streamUrl = basic?.radioStreamingUrl ?? null
  const tvUrl = getTvStreamUrl(basic)
  const currentTrack = streaming?.currentTrack
  const trackCover = currentTrack?.coverUrl ?? null
  const trackKey =
    trackCover ?? `${currentTrack?.title ?? ''}|${currentTrack?.artist ?? ''}`

  const [tvOpen, setTvOpen] = useState(false)

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

  // Fondo dinámico con crossfade
  const [bg, setBg] = useState<{ current: string | null; previous: string | null }>({
    current: null,
    previous: null
  })
  useEffect(() => {
    if (!artwork) return
    setBg((prev) => (prev.current === artwork ? prev : { current: artwork, previous: prev.current }))
  }, [artwork])

  useMediaSession(
    {
      title: currentTrack?.title,
      artist: currentTrack?.artist,
      artwork
    },
    { enabled: radioEnabled }
  )

  const { progress } = useTrackProgress(
    currentTrack?.duration,
    trackKey,
    isPlaying,
    currentTrack?.elapsed
  )

  const socialLinks = getSocialLinks(clientData?.socialNetworks)

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden="true">
        {radioEnabled && bg.previous && (
          <img className={`${styles.bgImg} ${styles.bgOut}`} src={bg.previous} alt="" />
        )}
        {radioEnabled && bg.current && (
          <img className={styles.bgImg} src={bg.current} alt="" />
        )}
        {radioEnabled && <VuMeter className={styles.vuLayer} />}
        <div className={styles.bgOverlay} />
      </div>

      <div className={styles.shell}>
        <header className={styles.header}>
          <SmartImage className={styles.logo} src={basic?.logoUrl} alt={name} />
          <Weather location={basic?.location} />
        </header>

        <GcBar messages={clientData?.gcBar} />

        {isHome ? (
          <div className={styles.columns}>
            {radioEnabled ? (
              <section className={styles.current}>
                <div className={styles.artworkWrap}>
                  <SmartImage
                    className={styles.artwork}
                    crossfade
                    src={trackCover}
                    fallbacks={[basic?.coverUrl, basic?.logoUrl]}
                    alt=""
                  />
                  <div className={styles.coverBar}>
                    <div
                      className={styles.coverBarFill}
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                </div>

                <div className={styles.status}>
                  {status === 'off' ? 'Fuera del aire' : isLive ? '● EN VIVO' : 'En el aire'}
                </div>

                <h1 className={styles.title}>
                  {isLoading ? 'Cargando…' : currentTrack?.title ?? 'Sintoniza nuestra señal'}
                </h1>
                <p className={styles.artist}>
                  {currentTrack?.artist ?? (isLoading ? '' : name)}
                </p>

                <div className={styles.playerArea}>
                  <button
                    type="button"
                    className={styles.play}
                    onClick={toggle}
                    disabled={!streamUrl}
                    aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                  >
                    {isPlaying ? '❚❚' : '▶'}
                  </button>
                </div>
              </section>
            ) : (
              <section className={styles.current}>
                {tvUrl && <TvPlayer src={tvUrl} autoPlay hero />}
              </section>
            )}

            <aside className={styles.side}>
              <div className={styles.clockArea}>
                <DigitalClock />
              </div>

              {radioEnabled && (
                <div className={styles.sideNext}>
                  <NextTrack
                    variant="large"
                    next={streaming?.nextTrack}
                    fallbackCover={basic?.coverUrl}
                  />
                </div>
              )}

              <div className={styles.toolbar}>
                {radioEnabled && tvUrl && (
                  <button
                    type="button"
                    className={styles.toolbarBtn}
                    onClick={() => setTvOpen(true)}
                  >
                    Señal de TV
                  </button>
                )}
                <span className={styles.toolbarShare}>
                  <ShareButton title={name} />
                </span>
                <span className={styles.toolbarInstall}>
                  <InstallPrompt />
                </span>
              </div>

              {socialLinks.length > 0 && (
                <div className={styles.social}>
                  {socialLinks.map((link) => (
                    <a
                      key={link.key}
                      className={styles.socialLink}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={link.label}
                      title={link.label}
                    >
                      <BrandIcon name={link.key} size={18} />
                    </a>
                  ))}
                </div>
              )}
            </aside>
          </div>
        ) : (
          <main className={styles.routes}>
            <Outlet />
          </main>
        )}

        <footer className={styles.footer}>{name} · IPStream Panel</footer>
      </div>

      {tvOpen && tvUrl && (
        <div className={styles.modal} onClick={() => setTvOpen(false)}>
          <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className={styles.close}
              onClick={() => setTvOpen(false)}
              aria-label="Cerrar TV"
            >
              ×
            </button>
            <TvPlayer src={tvUrl} autoPlay />
          </div>
        </div>
      )}
    </div>
  )
}
