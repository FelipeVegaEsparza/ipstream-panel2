import { useState } from 'react'
import { asArray } from '@/core/adapters'
import { buildImageUrl } from '@/core/api'
import type { Videocast } from '@/core/types'
import { Card, ContentModal, Grid, Section, SmartImage } from '@/ui'
import { ShareModal } from '@/modules/share/ShareModal'
import { isDirectMediaFile, videoEmbedUrl } from '@/modules/videos/embed'
import type { SectionDataProps } from './format'
import { episodeMeta } from './format'
import { VideocastsList } from './VideocastsList'
import styles from './content.module.css'

function VideocastModal({ item, onClose }: { item: Videocast; onClose: () => void }) {
  const [shareOpen, setShareOpen] = useState(false)
  const videoUrl = buildImageUrl(item.videoUrl)
  const embedUrl = videoUrl ? videoEmbedUrl(videoUrl) : null
  const isDirectFile = Boolean(videoUrl && isDirectMediaFile(videoUrl))
  const shareUrl = `${window.location.origin}/videocasts/${item.id}`

  return (
    <ContentModal open title={item.title} onClose={onClose}>
      <p className={styles.muted}>
        {episodeMeta(item.season, item.episodeNumber, item.duration)}
      </p>
      {embedUrl ? (
        <div className={styles.video} style={{ position: 'relative' }}>
          <iframe
            src={embedUrl}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: 'var(--radius-md)'
            }}
          />
        </div>
      ) : isDirectFile && videoUrl ? (
        <video className={styles.video} controls playsInline src={videoUrl} />
      ) : videoUrl ? (
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
          <p style={{ margin: 0 }}>Contenido no disponible para reproducción</p>
          <a
            href={videoUrl}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'inherit', textDecoration: 'underline' }}
          >
            Abrir en YouTube/Vimeo
          </a>
        </div>
      ) : (
        <SmartImage className={styles.media} src={item.imageUrl} alt={item.title} />
      )}
      {item.description && <p className={styles.sectionBody}>{item.description}</p>}
      <button
        type="button"
        className={styles.seeAll}
        onClick={() => setShareOpen(true)}
      >
        Compartir
      </button>
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={item.title}
        url={shareUrl}
      />
    </ContentModal>
  )
}

export function VideocastsSection({ clientData, isLoading }: SectionDataProps) {
  const videocasts = asArray(clientData?.videocasts)
  const [active, setActive] = useState<Videocast | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const [listPage, setListPage] = useState(1)

  return (
    <>
      <Section title="Videocasts" visible={videocasts.length > 0} loading={isLoading}>
        <Grid>
          {videocasts.map((videocast) => (
            <Card key={videocast.id}>
              <button
                type="button"
                className={styles.cardButton}
                onClick={() => setActive(videocast)}
                aria-label={`Abrir videocast ${videocast.title}`}
              >
                <SmartImage
                  className={styles.media}
                  src={videocast.imageUrl}
                  alt={videocast.title}
                />
                <div className={styles.body}>
                  <h3 className={styles.itemTitle}>{videocast.title}</h3>
                  {videocast.description && (
                    <p className={`${styles.muted} ${styles.clamp}`}>
                      {videocast.description}
                    </p>
                  )}
                </div>
              </button>
            </Card>
          ))}
        </Grid>
        <p>
          <button
            type="button"
            className={styles.seeAll}
            onClick={() => setListOpen(true)}
          >
            Ver todos →
          </button>
        </p>
      </Section>

      <ContentModal
        open={listOpen}
        title="Videocasts"
        onClose={() => setListOpen(false)}
      >
        <VideocastsList
          page={listPage}
          onPageChange={setListPage}
          onSelect={(item) => {
            setListOpen(false)
            setActive(item)
          }}
        />
      </ContentModal>

      {active && <VideocastModal item={active} onClose={() => setActive(null)} />}
    </>
  )
}
