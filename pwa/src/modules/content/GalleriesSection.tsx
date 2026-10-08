import { useCallback, useEffect, useState } from 'react'
import { asArray } from '@/core/adapters'
import { buildImageUrl } from '@/core/api'
import type { Gallery } from '@/core/types'
import { Card, Grid, Section, SmartImage } from '@/ui'
import type { SectionDataProps } from './format'
import styles from './content.module.css'
import carousel from './GalleriesSection.module.css'

export function GalleriesSection({ clientData, isLoading }: SectionDataProps) {
  const galleries = asArray(clientData?.galleries)
  const [active, setActive] = useState<Gallery | null>(null)
  const [index, setIndex] = useState(0)

  const images = active ? asArray(active.images) : []

  const open = (gallery: Gallery) => {
    if (asArray(gallery.images).length === 0) return
    setActive(gallery)
    setIndex(0)
  }
  const close = useCallback(() => setActive(null), [])
  const prev = useCallback(
    () => setIndex((i) => Math.max(0, i - 1)),
    []
  )
  const next = useCallback(
    () => setIndex((i) => Math.min(images.length - 1, i + 1)),
    [images.length]
  )

  useEffect(() => {
    if (!active) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowLeft') prev()
      if (event.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, close, prev, next])

  return (
    <>
      <Section title="Galerías" visible={galleries.length > 0} loading={isLoading}>
        <Grid>
          {galleries.map((gallery) => {
            const cover = buildImageUrl(asArray(gallery.images)[0]?.imageUrl)
            return (
              <Card key={gallery.id}>
                <button
                  type="button"
                  className={styles.galleryCard}
                  onClick={() => open(gallery)}
                  aria-label={`Ver galería ${gallery.title}`}
                >
                  {cover ? (
                    <img
                      className={styles.galleryCover}
                      src={cover}
                      alt={gallery.title}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className={styles.galleryCoverEmpty} aria-hidden="true">
                      🖼️
                    </div>
                  )}
                  <div className={styles.body}>
                    <h3 className={styles.itemTitle}>{gallery.title}</h3>
                    {gallery.description && (
                      <p className={`${styles.muted} ${styles.clamp}`}>
                        {gallery.description}
                      </p>
                    )}
                    <p className={styles.muted}>
                      {asArray(gallery.images).length} fotos
                    </p>
                  </div>
                </button>
              </Card>
            )
          })}
        </Grid>
      </Section>

      {active && (
        <div
          className={carousel.overlay}
          role="dialog"
          aria-modal="true"
          onClick={close}
        >
          <div
            className={carousel.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <header className={carousel.header}>
              <h3 className={carousel.title}>{active.title}</h3>
              <span className={carousel.counter}>
                {index + 1} / {images.length}
              </span>
              <button
                type="button"
                className={carousel.close}
                onClick={close}
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>

            <div className={carousel.viewport}>
              <button
                type="button"
                className={carousel.arrow}
                onClick={prev}
                disabled={index === 0}
                aria-label="Anterior"
              >
                ‹
              </button>
              <SmartImage
                className={carousel.image}
                src={images[index]?.imageUrl}
                alt={active.title}
              />
              <button
                type="button"
                className={carousel.arrow}
                onClick={next}
                disabled={index >= images.length - 1}
                aria-label="Siguiente"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
