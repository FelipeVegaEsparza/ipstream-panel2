import { Outlet } from 'react-router-dom'
import { getTvStreamUrl, useServiceMode } from '@/core/service'
import { useLiveRadio } from '@/modules/player/useLiveRadio'
import { NextTrack } from '@/modules/player/NextTrack'
import { PlayerBar } from '@/modules/player/PlayerBar'
import { TrackProgress } from '@/modules/player/TrackProgress'
import { InstallPrompt } from '@/modules/pwa/InstallPrompt'
import { BrandIcon, getSocialLinks } from '@/modules/social/brand'
import { GcBar } from '@/modules/content/GcBar'
import { TvPlayer } from '@/modules/tv/TvPlayer'
import { Weather } from '@/modules/weather/Weather'
import { SmartImage } from '@/ui'
import type { TemplateProps } from '../index'
import styles from './AppTemplate.module.css'

export function AppTemplate({ clientData, isLoading }: TemplateProps) {
  const mode = useServiceMode(clientData)
  const radioEnabled = mode !== 'tv'
  const tvUrl = getTvStreamUrl(clientData?.basicData)
  const live = useLiveRadio(clientData, { enabled: radioEnabled })
  const socialLinks = getSocialLinks(clientData?.socialNetworks)
  const displayName = isLoading ? 'Cargando…' : live.name
  const isOn = live.status !== 'off'

  return (
    <div className={styles.page}>
      <header className={styles.appBar}>
        <div className={styles.appBrand}>
          <SmartImage className={styles.logo} src={live.basic?.logoUrl} alt="" />
          <div className={styles.appTitles}>
            <span className={styles.appName}>
              {displayName} <span className={styles.badge}>App</span>
            </span>
            {radioEnabled && (
              <span className={styles.appStatus}>
                <span className={isOn ? styles.onDot : styles.offDot} />
                {isOn ? 'En línea' : 'Fuera del aire'}
              </span>
            )}
          </div>
        </div>
        <div className={styles.appActions}>
          <Weather location={live.basic?.location} />
          <InstallPrompt />
        </div>
      </header>

      <GcBar messages={clientData?.gcBar} />

      <main className={styles.main}>
        {radioEnabled ? (
          <>
            <section className={styles.heroCard}>
              <div className={styles.heroCoverWrap}>
                <SmartImage
                  className={styles.heroCover}
                  crossfade
                  src={live.trackCover}
                  fallbacks={live.fallbacks}
                  alt=""
                />
              </div>
              <div className={styles.heroBody}>
                <span className={styles.eyebrow}>
                  {live.isLive ? 'EN VIVO' : 'Reproduciendo'}
                </span>
                <h1 className={styles.song}>
                  {live.currentTrack?.title ?? 'Descubre nuestra señal'}
                </h1>
                <p className={styles.artist}>{live.currentTrack?.artist ?? displayName}</p>
                <div className={styles.heroMeta}>
                  <span>{live.listeners} oyentes</span>
                  {live.bitrate ? <span>· {live.bitrate} kbps</span> : null}
                </div>
                <button
                  type="button"
                  className={styles.play}
                  onClick={live.toggle}
                  disabled={!live.streamUrl}
                >
                  {live.isPlaying ? '❚❚ Pausa' : '▶ Reproducir'}
                </button>
                <div className={styles.progressWrap}>
                  <TrackProgress
                    duration={live.currentTrack?.duration}
                    trackKey={live.trackKey}
                    isPlaying={live.isPlaying}
                    serverElapsed={live.currentTrack?.elapsed}
                  />
                </div>
              </div>
            </section>

            {live.nextTrack && (
              <section className={styles.nextCard}>
                <span className={styles.nextTitle}>A continuación</span>
                <NextTrack next={live.nextTrack} fallbackCover={live.basic?.coverUrl} />
              </section>
            )}
          </>
        ) : (
          tvUrl && <TvPlayer src={tvUrl} autoPlay hero />
        )}

        <div className={styles.feed}>
          <Outlet />
        </div>

        {socialLinks.length > 0 && (
          <div className={styles.socialBar}>
            <span className={styles.socialHint}>Síguenos</span>
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
      </main>

      <footer className={styles.footer}>{displayName} · IPStream Panel</footer>
      {radioEnabled && (
        <PlayerBar fallbackCovers={[live.basic?.coverUrl, live.basic?.logoUrl]} />
      )}
    </div>
  )
}
