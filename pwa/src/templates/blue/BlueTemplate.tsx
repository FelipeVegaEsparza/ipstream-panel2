import { useEffect, useState, type ComponentType } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { getTvStreamUrl, useServiceMode } from '@/core/service'
import { useLiveRadio } from '@/modules/player/useLiveRadio'
import { PlayerBar } from '@/modules/player/PlayerBar'
import { BrandIcon, getSocialLinks } from '@/modules/social/brand'
import { GcBar } from '@/modules/content/GcBar'
import { TvPlayer } from '@/modules/tv/TvPlayer'
import { SmartImage } from '@/ui'
import {
  FaBullhorn,
  FaCalendarDays,
  FaCloudSun,
  FaHandshake,
  FaHeart,
  FaImages,
  FaMicrophoneLines,
  FaNewspaper,
  FaPeopleGroup,
  FaPodcast,
  FaSquarePollVertical,
  FaTags,
  FaTv,
  FaVideo
} from 'react-icons/fa6'
import {
  getSectionOrder,
  SECTION_LABELS,
  sectionAnchorId,
  sectionHasContent,
  type SectionId
} from '@/modules/content/sections'
import type { TemplateProps } from '../index'
import styles from './BlueTemplate.module.css'

const SECTION_ICONS: Record<SectionId, ComponentType<{ size?: number }>> = {
  polls: FaSquarePollVertical,
  tv: FaTv,
  weather: FaCloudSun,
  promotions: FaTags,
  news: FaNewspaper,
  programs: FaMicrophoneLines,
  galleries: FaImages,
  podcasts: FaPodcast,
  videocasts: FaVideo,
  videos: FaBullhorn,
  events: FaCalendarDays,
  announcers: FaPeopleGroup,
  sponsors: FaHandshake,
  social: FaHeart
}

export function BlueTemplate({ clientData, isLoading }: TemplateProps) {
  const mode = useServiceMode(clientData)
  const radioEnabled = mode !== 'tv'
  const tvUrl = getTvStreamUrl(clientData?.basicData)
  const live = useLiveRadio(clientData, { enabled: radioEnabled })
  const socialLinks = getSocialLinks(clientData?.socialNetworks)
  const displayName = isLoading ? 'Cargando…' : live.name
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const [menuOpen, setMenuOpen] = useState(false)

  // Solo se listan las secciones que realmente tienen contenido visible.
  const navItems = getSectionOrder('blue').filter((id) =>
    sectionHasContent(id, clientData, socialLinks.length)
  )

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [menuOpen])

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brandGroup}>
          <SmartImage className={styles.logo} src={live.basic?.logoUrl} alt={displayName} />
          <span className={styles.srOnly}>{displayName}</span>
          <span className={styles.srOnly}>Blue</span>
        </div>

        {isHome && navItems.length > 0 && (
          <nav className={styles.nav} aria-label="Secciones del sitio">
            {navItems.map((id) => {
              const Icon = SECTION_ICONS[id]
              return (
                <a key={id} className={styles.navLink} href={`#${sectionAnchorId(id)}`}>
                  <Icon size={14} aria-hidden="true" />
                  <span>{SECTION_LABELS[id]}</span>
                </a>
              )
            })}
          </nav>
        )}

        <div className={styles.actions}>
          {isHome && navItems.length > 0 && (
            <button
              type="button"
              className={styles.menuBtn}
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menú de secciones"
              aria-controls="menu-secciones"
              aria-expanded={menuOpen}
            >
              ☰
            </button>
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
              )              )}
            </div>
          )}
        </div>
      </header>

      <GcBar messages={clientData?.gcBar} className={styles.gcBar} />

      <main className={styles.main}>
        {!radioEnabled && tvUrl && <TvPlayer src={tvUrl} autoPlay hero />}
        <Outlet />
      </main>

      <footer className={styles.footer}>{displayName} · IPStream Panel</footer>
      {radioEnabled && (
        <PlayerBar fallbackCovers={[live.basic?.coverUrl, live.basic?.logoUrl]} />
      )}

      {isHome && navItems.length > 0 && (
        <>
          <div
            className={`${styles.scrim} ${menuOpen ? styles.scrimOpen : ''}`}
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <nav
            id="menu-secciones"
            className={`${styles.drawer} ${menuOpen ? styles.drawerOpen : ''}`}
            aria-label="Secciones del sitio"
          >
            <div className={styles.drawerHead}>
              <SmartImage
                className={styles.drawerLogo}
                src={live.basic?.logoUrl}
                alt={displayName}
              />
              <span className={styles.drawerTitle}>Secciones</span>
              <button
                type="button"
                className={styles.drawerClose}
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar menú"
              >
                ×
              </button>
            </div>
            <ul className={styles.drawerList}>
              {navItems.map((id) => {
                const Icon = SECTION_ICONS[id]
                return (
                  <li key={id}>
                    <a
                      className={styles.drawerLink}
                      href={`#${sectionAnchorId(id)}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <Icon size={16} aria-hidden="true" />
                      {SECTION_LABELS[id]}
                    </a>
                  </li>
                )
              })}
            </ul>
            <div className={styles.drawerFoot}>
              {socialLinks.length > 0 && (
                <div className={styles.drawerSocials}>
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
          </nav>
        </>
      )}
    </div>
  )
}
