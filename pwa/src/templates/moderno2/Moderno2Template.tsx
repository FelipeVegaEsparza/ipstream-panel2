import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { getTvStreamUrl, useServiceMode } from '@/core/service'
import { useLiveRadio } from '@/modules/player/useLiveRadio'
import { PlayerBar } from '@/modules/player/PlayerBar'
import { GcBar } from '@/modules/content/GcBar'
import { ContentSlotsContext } from '@/modules/content/ContentSlotsContext'
import { useSongHistory } from '@/modules/history/useSongHistory'
import { SongHistorySection } from '@/modules/history/SongHistorySection'
import { BrandIcon, getSocialLinks } from '@/modules/social/brand'
import { MultiCityWeather } from '@/modules/weather/MultiCityWeather'
import { TvPlayer } from '@/modules/tv/TvPlayer'
import { SmartImage } from '@/ui'
import { SectionHeadingContext } from '@/ui/SectionHeadingContext'
import {
  getSectionOrder,
  SECTION_LABELS,
  sectionAnchorId,
  sectionHasContent,
  type SectionId
} from '@/modules/content/sections'
import type { TemplateProps } from '../index'
import { Moderno2Contact } from './Moderno2Contact'
import styles from './Moderno2Template.module.css'

type NavId = SectionId | 'inicio'

export function Moderno2Template({ clientData, isLoading }: TemplateProps) {
  const radioEnabled = useServiceMode(clientData) !== 'tv'
  const tvUrl = getTvStreamUrl(clientData?.basicData)
  const live = useLiveRadio(clientData, { enabled: radioEnabled })
  const socialLinks = getSocialLinks(clientData?.socialNetworks)
  const history = useSongHistory(
    radioEnabled ? clientData?.client?.id : null,
    radioEnabled ? live.currentTrack : null
  )
  const [menuOpen, setMenuOpen] = useState(false)

  const displayName = isLoading ? 'Cargando…' : live.name
  const airLabel =
    live.status === 'off' ? 'FUERA DEL AIRE' : live.isLive ? 'EN VIVO' : 'AUTODJ'

  const navItems: Array<{ id: NavId; label: string }> = [
    { id: 'inicio', label: 'Inicio' },
    ...getSectionOrder('moderno2')
      .filter((id) => sectionHasContent(id, clientData, socialLinks.length))
      .map((id) => ({ id, label: SECTION_LABELS[id] }))
  ]

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const hrefFor = (id: NavId): string =>
    id === 'inicio' ? '#section-inicio' : `#${sectionAnchorId(id)}`

  return (
    <div className={styles.page}>
      <header className={styles.navBar}>
        <div className={styles.navInner}>
          <a className={styles.logoLink} href="#section-inicio">
            <SmartImage
              className={styles.logo}
              src={live.basic?.logoUrl}
              alt={displayName}
            />
          </a>

          <nav className={styles.nav} aria-label="Secciones">
            <ul
              className={`${styles.navList} ${menuOpen ? styles.navListOpen : ''}`}
            >
              {navItems.map((item) => (
                <li key={item.id}>
                  <a
                    className={styles.navLink}
                    href={hrefFor(item.id)}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.topActions}>
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
                    <BrandIcon name={link.key} size={16} />
                  </a>
                ))}
              </div>
            )}
            <button
              type="button"
              className={styles.menuBtn}
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Abrir menú de secciones"
              aria-expanded={menuOpen}
            >
              ☰
            </button>
          </div>
        </div>
        <GcBar className={styles.gcBar} messages={clientData?.gcBar} />
      </header>

      <header className={styles.hero} id="section-inicio">
        <div className={styles.heroBg} aria-hidden="true">
          {radioEnabled && live.artwork && (
            <img className={styles.heroBgImg} src={live.artwork} alt="" />
          )}
          <div className={styles.heroOverlay} />
        </div>

        <div className={`${styles.container} ${styles.heroInner}`}>
          {radioEnabled ? (
            <div className={styles.heroBody}>
              <div className={styles.heroCover}>
                <SmartImage
                  className={styles.heroCoverImg}
                  crossfade
                  src={live.trackCover}
                  fallbacks={[...live.fallbacks]}
                  alt=""
                />
              </div>

              <div className={styles.heroInfo}>
                <span className={styles.liveBadge}>
                  <span
                    className={live.status === 'off' ? styles.offDot : styles.onDot}
                    aria-hidden="true"
                  />
                  {airLabel}
                </span>
                <h1 className={styles.song}>
                  {live.currentTrack?.title ?? 'La radio suena en vivo'}
                </h1>
                <p className={styles.artist}>
                  {live.currentTrack?.artist ?? displayName}
                </p>

                <div className={styles.heroActions}>
                  <button
                    type="button"
                    className={styles.playBtn}
                    onClick={live.toggle}
                    disabled={!live.streamUrl}
                  >
                    {live.isPlaying ? 'PAUSAR' : 'REPRODUCIR'}
                  </button>
                  <a className={styles.secondaryBtn} href={`#${sectionAnchorId('programs')}`}>
                    PROGRAMAS
                  </a>
                </div>
              </div>
            </div>
          ) : (
            tvUrl && <TvPlayer src={tvUrl} autoPlay hero />
          )}
        </div>
      </header>

      {menuOpen && (
        <div className={styles.scrim} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}

      <main className={styles.content}>
        <div className={styles.container}>
          <SectionHeadingContext.Provider value>
            <ContentSlotsContext.Provider
              value={{
                after: radioEnabled
                  ? { news: <SongHistorySection tracks={history} /> }
                  : {}
              }}
            >
              <Outlet />
            </ContentSlotsContext.Provider>
            <MultiCityWeather location={clientData?.basicData?.location} />
            <Moderno2Contact clientData={clientData} />
          </SectionHeadingContext.Provider>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <span className={styles.footerText}>
            <strong>{displayName}</strong> · IPStream Panel
          </span>
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
                  <BrandIcon name={link.key} size={16} />
                </a>
              ))}
            </div>
          )}
        </div>
      </footer>

      {radioEnabled && (
        <PlayerBar
          fallbackCovers={[live.basic?.coverUrl, live.basic?.logoUrl]}
          vuMeter
        />
      )}
    </div>
  )
}
