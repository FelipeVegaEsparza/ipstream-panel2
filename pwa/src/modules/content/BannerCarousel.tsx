import { useEffect, useState } from 'react'
import type { Banner } from '@/core/types'
import { SmartImage } from '@/ui'
import styles from './BannerCarousel.module.css'

interface BannerCarouselProps {
  banners?: Banner[] | null
  fallbackAlt?: string | null
}

const ROTATION_MS = 6000

function safeLink(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!/^https?:\/\//i.test(trimmed)) return null
  try {
    const url = new URL(trimmed)
    return url.protocol === 'http:' || url.protocol === 'https:' ? trimmed : null
  } catch {
    return null
  }
}

function sortBanners(banners: Banner[]): Banner[] {
  return banners
    .slice()
    .sort((a, b) => {
      const byOrder = (a.order ?? 0) - (b.order ?? 0)
      if (byOrder !== 0) return byOrder
      const aTime = Date.parse(a.createdAt)
      const bTime = Date.parse(b.createdAt)
      return (Number.isNaN(aTime) ? 0 : aTime) - (Number.isNaN(bTime) ? 0 : bTime)
    })
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(media.matches)
    media.addEventListener?.('change', onChange)
    return () => media.removeEventListener?.('change', onChange)
  }, [])

  return reduced
}

export function BannerCarousel({ banners, fallbackAlt }: BannerCarouselProps) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [broken, setBroken] = useState<Set<string>>(new Set())
  const reducedMotion = usePrefersReducedMotion()

  const ordered = sortBanners(banners ?? [])
  const visible = ordered.filter(
    (banner) => banner.imageUrl?.trim() && !broken.has(`${banner.id}:${banner.imageUrl}`)
  )
  const count = visible.length
  const activeIndex = count > 0 ? Math.min(index, count - 1) : 0

  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(count - 1, 0)))
  }, [count])

  useEffect(() => {
    if (paused || reducedMotion || count < 2) return
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % count)
    }, ROTATION_MS)
    return () => clearInterval(timer)
  }, [paused, reducedMotion, count])

  if (count === 0) return null

  const banner = visible[activeIndex]
  if (!banner) return null

  const link = safeLink(banner.linkUrl)
  const alt = fallbackAlt ? `${fallbackAlt} - banner ${activeIndex + 1}` : `Banner ${activeIndex + 1}`

  const markBroken = () => {
    setBroken((current) => {
      const next = new Set(current)
      next.add(`${banner.id}:${banner.imageUrl}`)
      return next
    })
  }

  const image = (
    <span key={`${banner.id}:${banner.imageUrl}`} className={styles.slide}>
      <SmartImage
        className={styles.media}
        src={banner.imageUrl}
        alt={alt}
        onError={markBroken}
      />
    </span>
  )

  const content = link ? (
    <a
      className={styles.link}
      href={link}
      target="_blank"
      rel="noopener noreferrer"
    >
      {image}
    </a>
  ) : (
    image
  )

  if (count === 1) {
    return (
      <div className={styles.container}>
        <div className={styles.frame}>{content}</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div
        className={styles.frame}
        role="region"
        aria-roledescription="carrusel"
        aria-label="Banners promocionales"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setPaused(false)
          }
        }}
      >
        {content}

        <div className={styles.controls}>
          <button
            type="button"
            className={styles.control}
            onClick={() => setIndex((activeIndex - 1 + count) % count)}
            aria-label="Banner anterior"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <div className={styles.indicators}>
            {visible.map((item, position) => (
              <button
                key={`${item.id}:${item.imageUrl}`}
                type="button"
                className={`${styles.indicator} ${position === activeIndex ? styles.active : ''}`}
                onClick={() => setIndex(position)}
                aria-label={`Ir al banner ${position + 1}`}
                aria-current={position === activeIndex ? 'true' : undefined}
              />
            ))}
          </div>
          <button
            type="button"
            className={styles.control}
            onClick={() => setIndex((activeIndex + 1) % count)}
            aria-label="Banner siguiente"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </div>
    </div>
  )
}
