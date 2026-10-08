import { useEffect, useState } from 'react'
import { asArray } from '@/core/adapters'
import type { Video } from '@/core/types'
import { Card, Grid, Section } from '@/ui'
import type { SectionDataProps } from '@/modules/content/format'
import { isDirectMediaFile, isHlsStream, videoEmbedUrl } from './embed'
import { HlsVideo } from './HlsVideo'
import styles from './VideosSection.module.css'

const YOUTUBE_EMBED_PREFIX = 'https://www.youtube.com/embed/'

export function VideosSection({ clientData, isLoading }: SectionDataProps) {
  const videos = asArray(clientData?.videos).filter((video) => Boolean(video.videoUrl))
  const [active, setActive] = useState<Video | null>(null)

  useEffect(() => {
    if (active && !videos.some((video) => video.id === active.id)) {
      setActive(null)
    }
  }, [active, videos])

  const activeUrl = active?.videoUrl ?? null
  const activeEmbed = activeUrl ? videoEmbedUrl(activeUrl) : null
  const activeIsHls = Boolean(activeUrl && isHlsStream(activeUrl))
  const activeIsFile = Boolean(activeUrl && isDirectMediaFile(activeUrl))

  return (
    <>
      <Section title="Videos" visible={videos.length > 0} loading={isLoading}>
        <Grid>
          {videos.map((video) => {
            const embedUrl = video.videoUrl ? videoEmbedUrl(video.videoUrl) : null
            const youtubeId = embedUrl?.startsWith(YOUTUBE_EMBED_PREFIX)
              ? embedUrl.slice(YOUTUBE_EMBED_PREFIX.length)
              : null
            return (
              <Card key={video.id}>
                <button
                  type="button"
                  className={styles.videoCard}
                  onClick={() => setActive(video)}
                  aria-label={`Reproducir ${video.name}`}
                >
                  {youtubeId ? (
                    <img
                      className={styles.thumb}
                      src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
                      alt={video.name}
                      loading="lazy"
                    />
                  ) : (
                    <div className={styles.thumbPlaceholder}>▶</div>
                  )}
                  <div className={styles.body}>
                    <h3 className={styles.title}>{video.name}</h3>
                  </div>
                </button>
              </Card>
            )
          })}
        </Grid>
      </Section>

      {active && activeUrl && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          onClick={() => setActive(null)}
        >
          <div className={styles.overlayCard} onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className={styles.close}
              onClick={() => setActive(null)}
              aria-label="Cerrar"
            >
              ×
            </button>
            {activeEmbed ? (
              <iframe
                className={styles.iframe}
                src={activeEmbed}
                title={active.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : activeIsHls && activeUrl ? (
              <HlsVideo className={styles.video} src={activeUrl} />
            ) : activeIsFile ? (
              <video className={styles.video} controls playsInline src={activeUrl} />
            ) : (
              <div
                className={styles.video}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-3)',
                  textAlign: 'center',
                  color: '#fff',
                  padding: 'var(--space-4)'
                }}
              >
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  Contenido no disponible para reproducción
                </p>
                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'inherit', textDecoration: 'underline' }}
                >
                  Abrir en YouTube/Vimeo
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
