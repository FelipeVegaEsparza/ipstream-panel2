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
import { SmartImage } from '@/ui'
import type { TemplateProps } from '../index'
import styles from './ModernoTemplate.module.css'

export function ModernoTemplate({ clientData, isLoading }: TemplateProps) {
  const mode = useServiceMode(clientData)
  const radioEnabled = mode !== 'tv'
  const tvUrl = getTvStreamUrl(clientData?.basicData)
  const live = useLiveRadio(clientData, { enabled: radioEnabled })
  const socialLinks = getSocialLinks(clientData?.socialNetworks)
  const displayName = isLoading ? 'Cargando…' : live.name
  const onAir = live.status !== 'off'
  const city = live.basic?.location?.city || live.basic?.location?.region || null

  return (
    <div className={styles.page}>
      <header className={styles.topbar} id="inicio">
        <a href="#inicio" className={styles.brandGroup}>
          <SmartImage className={styles.logo} src={live.basic?.logoUrl} alt="" />
          <span className={styles.brandName}>{displayName}</span>
          <span className={styles.badge}>Moderno</span>
        </a>

        <nav className={styles.nav} aria-label="Secciones">
          <a className={styles.navLink} href="#inicio">
            Inicio
          </a>
          <a className={styles.navLink} href="#vivo">
            En vivo
          </a>
          <a className={styles.navLink} href="#contenido">
            Contenido
          </a>
        </nav>

        <div className={styles.actions}>
          {radioEnabled && (
            <span className={`${styles.liveChip} ${onAir ? styles.liveChipOn : ''}`}>
              <span className={styles.liveDot} />
              EN VIVO{live.bitrate ? ` · ${live.bitrate}` : ''}
            </span>
          )}
          {socialLinks.length > 0 && (
            <div className={styles.socials}>
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
                  <BrandIcon name={link.key} size={15} />
                </a>
              ))}
            </div>
          )}
          <InstallPrompt />
        </div>
      </header>

      <GcBar messages={clientData?.gcBar} />

      <main className={styles.main}>
        {radioEnabled ? (
          <section
            className={styles.hero}
            id="vivo"
            style={live.artwork ? { backgroundImage: `url(${live.artwork})` } : undefined}
          >
            <div className={styles.heroScrim} aria-hidden="true" />
            <div className={styles.heroInner}>
              <div className={styles.heroCopy}>
                <p className={styles.eyebrow}>
                  <span className={styles.liveDot} />
                  {live.status === 'off' ? 'Fuera del aire' : live.isLive ? 'Transmisión en vivo' : 'Al aire'}
                </p>
                <h1 className={styles.headline}>
                  {live.currentTrack?.title ?? 'La playlist de tu vida'}
                </h1>
                <p className={styles.artist}>
                  {live.currentTrack?.artist ?? displayName}
                  {city ? ` · ${city}` : ''}
                </p>
                <div className={styles.heroMeta}>
                  <span>{live.listeners} oyentes ahora</span>
                  {live.bitrate ? <span>· {live.bitrate} kbps</span> : null}
                </div>
                <div className={styles.controls}>
                  <button
                    type="button"
                    className={styles.play}
                    onClick={live.toggle}
                    disabled={!live.streamUrl}
                  >
                    {live.isPlaying ? 'Pausar' : 'Escuchar en vivo'}
                  </button>
                </div>
                <div className={styles.progressWrap}>
                  <TrackProgress
                    duration={live.currentTrack?.duration}
                    trackKey={live.trackKey}
                    isPlaying={live.isPlaying}
                    serverElapsed={live.currentTrack?.elapsed}
                  />
                </div>
              </div>

              <div className={styles.heroCover}>
                <SmartImage
                  className={styles.cover}
                  crossfade
                  src={live.trackCover}
                  fallbacks={live.fallbacks}
                  alt=""
                />
                {live.nextTrack && (
                  <div className={styles.heroNext}>
                    <NextTrack next={live.nextTrack} fallbackCover={live.basic?.coverUrl} />
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className={styles.hero} id="vivo">
            {tvUrl && <TvPlayer src={tvUrl} autoPlay hero />}
          </section>
        )}

        <div className={styles.content} id="contenido">
          <Outlet />
        </div>

        <section className={styles.band}>
          <div className={styles.bandCard}>
            <div className={styles.bandMedia}>
              <SmartImage
                className={styles.bandCover}
                src={live.basic?.coverUrl}
                fallbacks={live.fallbacks}
                alt=""
              />
            </div>
            <div className={styles.bandBody}>
              <span className={styles.bandKicker}>Sobre la radio</span>
              <h2 className={styles.bandTitle}>{displayName}</h2>
              <p className={styles.bandText}>
                {live.basic?.projectDescription ||
                  'Música, conversación y compañía durante toda tu jornada.'}
              </p>
              <div className={styles.bandLinks}>
                {socialLinks.map((link) => (
                  <a
                    key={link.key}
                    className={styles.bandLink}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <BrandIcon name={link.key} size={16} />
                    {link.label}
                  </a>
                ))}
                {live.basic?.websiteUrl && (
                  <a
                    className={styles.bandLink}
                    href={live.basic.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Sitio web
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerCol}>
            <span className={styles.footerBrand}>{displayName}</span>
            <p className={styles.footerDesc}>
              {live.basic?.projectDescription || 'Radio online · IPStream Panel'}
            </p>
          </div>
          <div className={styles.footerCol}>
            <span className={styles.footerHeading}>Escúchanos</span>
            {city ? <span className={styles.footerLine}>{city}</span> : null}
            {live.basic?.websiteUrl ? (
              <span className={styles.footerLine}>{live.basic.websiteUrl}</span>
            ) : null}
          </div>
          <div className={styles.footerCol}>
            <span className={styles.footerHeading}>Síguenos</span>
            <div className={styles.footerSocials}>
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
                  <BrandIcon name={link.key} size={15} />
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          © {displayName} · Todos los derechos reservados · IPStream Panel
        </div>
      </footer>
      {radioEnabled && (
        <PlayerBar fallbackCovers={[live.basic?.coverUrl, live.basic?.logoUrl]} />
      )}
    </div>
  )
}
