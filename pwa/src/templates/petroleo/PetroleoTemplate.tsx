import { Outlet } from 'react-router-dom'
import { FaBolt } from 'react-icons/fa6'
import { getTvStreamUrl, useServiceMode } from '@/core/service'
import { useLiveRadio } from '@/modules/player/useLiveRadio'
import { NextTrack } from '@/modules/player/NextTrack'
import { PlayerBar } from '@/modules/player/PlayerBar'
import { TrackProgress } from '@/modules/player/TrackProgress'
import { VuMeter } from '@/modules/player/VuMeter'
import { InstallPrompt } from '@/modules/pwa/InstallPrompt'
import { BrandIcon, getSocialLinks } from '@/modules/social/brand'
import { GcBar } from '@/modules/content/GcBar'
import { TvPlayer } from '@/modules/tv/TvPlayer'
import { WeatherForecastSection } from '@/modules/weather/WeatherForecastSection'
import { SmartImage } from '@/ui'
import type { TemplateProps } from '../index'
import styles from './PetroleoTemplate.module.css'

interface PetroleoTemplateProps extends TemplateProps {
  /** `blue` usa la paleta azul; por defecto, verde oliva. */
  variant?: 'green' | 'blue'
}

export function PetroleoTemplate({
  clientData,
  isLoading,
  variant = 'green'
}: PetroleoTemplateProps) {
  const mode = useServiceMode(clientData)
  const radioEnabled = mode !== 'tv'
  const tvUrl = getTvStreamUrl(clientData?.basicData)
  const live = useLiveRadio(clientData, { enabled: radioEnabled })
  const socialLinks = getSocialLinks(clientData?.socialNetworks)
  const displayName = isLoading ? 'Cargando…' : live.name
  const onAir = live.status !== 'off'
  const city = live.basic?.location?.city || live.basic?.location?.region || null
  const claim =
    live.basic?.projectDescription || 'Música, ideas y conversación para tu día.'

  // Titulares del ticker superior: últimas noticias o, si no hay, el claim.
  const tickerItems = (clientData?.news ?? [])
    .map((item) => item.name?.trim())
    .filter((name): name is string => Boolean(name))
    .slice(0, 8)
  const tickerText = tickerItems.length > 0 ? tickerItems.join('   •   ') : claim

  const currentTitle = live.currentTrack?.title ?? 'SIN PROGRAMA'
  const currentArtist = live.currentTrack?.artist ?? displayName
  const showStatus =
    live.status === 'live' ? 'EN VIVO' : live.status === 'autodj' ? 'AUTODJ' : 'FUERA DEL AIRE'

  return (
    <div className={`${styles.page} ${variant === 'blue' ? styles.blue : ''}`}>
      <div className={styles.headerWrap}>
        <div className={styles.topStrip}>
          <div className={styles.topStripInner}>
            <div className={styles.ticker}>
              <span className={styles.tickerLabel}>
                <FaBolt className={styles.tickerBolt} size={11} aria-hidden="true" /> Últimas
                noticias
              </span>
              <div className={styles.tickerTrack}>
                <span className={styles.tickerText}>{tickerText}</span>
                <span className={styles.tickerText} aria-hidden="true">
                  {tickerText}
                </span>
              </div>
            </div>

            {socialLinks.length > 0 && (
              <div className={styles.topSocials}>
                <span className={styles.topSocialsText}>Síguenos en:</span>
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
                    <BrandIcon name={link.key} size={14} />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <header className={styles.header} id="inicio">
          <div className={styles.headerInner}>
            <a href="#inicio" className={styles.brandGroup}>
              <SmartImage className={styles.logo} src={live.basic?.logoUrl} alt={displayName} />
            </a>

            <div className={styles.actions}>
              <InstallPrompt />
            </div>
          </div>
        </header>
      </div>

      <GcBar messages={clientData?.gcBar} className={styles.gcBar} />

      <main className={styles.main}>
        {radioEnabled ? (
          <section className={styles.hero} id="vivo">
            <VuMeter className={styles.vuLayer} />
            <div className={styles.heroInner}>
              <div className={styles.heroMedia}>
                <SmartImage
                  className={styles.heroCover}
                  crossfade
                  src={live.trackCover}
                  fallbacks={live.fallbacks}
                  alt=""
                />
                <span className={styles.heroTag}>{onAir ? 'EN VIVO' : 'RADIO'}</span>
                {city && <span className={styles.heroCity}>{city}</span>}
              </div>

              <div className={styles.heroInfo}>
                <p className={styles.eyebrow}>{onAir ? 'Ahora suena' : 'Fuera del aire'}</p>
                <h1 className={styles.headline}>{currentTitle}</h1>
                <p className={styles.artist}>{currentArtist}</p>

                <div className={styles.statsRow}>
                  <span className={styles.stat}>{live.listeners} oyentes</span>
                  <span className={styles.statSep}>•</span>
                  <span className={styles.stat}>{live.bitrate ? `${live.bitrate} kbps` : 'stream'}</span>
                  <span className={styles.statSep}>•</span>
                  <span className={styles.stat}>{showStatus}</span>
                </div>

                <div className={styles.controls}>
                  <button
                    type="button"
                    className={styles.play}
                    onClick={live.toggle}
                    disabled={!live.streamUrl}
                    aria-label={live.isPlaying ? 'Pausar' : 'Escuchar en vivo'}
                  >
                    {live.isPlaying ? '❚❚' : '▶'}
                  </button>
                  <span className={styles.playLabel}>
                    {live.isPlaying ? 'Pausar transmisión' : 'Escuchar en vivo'}
                  </span>
                </div>

                <div className={styles.progressWrap}>
                  <TrackProgress
                    duration={live.currentTrack?.duration}
                    trackKey={live.trackKey}
                    isPlaying={live.isPlaying}
                    serverElapsed={live.currentTrack?.elapsed}
                  />
                </div>

                {live.nextTrack && (
                  <div className={styles.heroNext}>
                    <NextTrack next={live.nextTrack} fallbackCover={live.basic?.coverUrl} />
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : (
          <div className={styles.tvHero}>
            {tvUrl && <TvPlayer src={tvUrl} autoPlay hero />}
          </div>
        )}

        <div className={styles.installRow}>
          <InstallPrompt />
        </div>

        <div className={styles.weatherBand}>
          <WeatherForecastSection clientData={clientData} isLoading={isLoading} />
        </div>

        <div className={styles.content} id="contenido">
          <Outlet />
        </div>
      </main>

      {radioEnabled && (
        <PlayerBar fallbackCovers={[live.basic?.coverUrl, live.basic?.logoUrl]} />
      )}
    </div>
  )
}
