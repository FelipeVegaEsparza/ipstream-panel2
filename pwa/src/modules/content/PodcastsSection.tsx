import { useState } from 'react'
import { asArray } from '@/core/adapters'
import { buildImageUrl } from '@/core/api'
import type { Podcast } from '@/core/types'
import { Card, ContentModal, Grid, Section, SmartImage } from '@/ui'
import { ShareModal } from '@/modules/share/ShareModal'
import type { SectionDataProps } from './format'
import { episodeMeta } from './format'
import { PodcastsList } from './PodcastsList'
import styles from './content.module.css'

function PodcastModal({ item, onClose }: { item: Podcast; onClose: () => void }) {
  const audioUrl = buildImageUrl(item.audioUrl)
  const [shareOpen, setShareOpen] = useState(false)
  const shareUrl = `${window.location.origin}/podcasts/${item.id}`

  return (
    <ContentModal open title={item.title} onClose={onClose}>
      <p className={styles.muted}>
        {episodeMeta(item.season, item.episodeNumber, item.duration)}
      </p>
      <SmartImage className={styles.media} src={item.imageUrl} alt={item.title} />
      {audioUrl && (
        <audio className={styles.audio} controls src={audioUrl} preload="none" />
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

export function PodcastsSection({ clientData, isLoading }: SectionDataProps) {
  const podcasts = asArray(clientData?.podcasts)
  const [active, setActive] = useState<Podcast | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const [listPage, setListPage] = useState(1)

  return (
    <>
      <Section title="Podcasts" visible={podcasts.length > 0} loading={isLoading}>
        <Grid>
          {podcasts.map((podcast) => (
            <Card key={podcast.id}>
              <button
                type="button"
                className={styles.cardButton}
                onClick={() => setActive(podcast)}
                aria-label={`Abrir podcast ${podcast.title}`}
              >
                <SmartImage
                  className={styles.media}
                  src={podcast.imageUrl}
                  alt={podcast.title}
                />
                <div className={styles.body}>
                  <h3 className={styles.itemTitle}>{podcast.title}</h3>
                  {podcast.description && (
                    <p className={`${styles.muted} ${styles.clamp}`}>
                      {podcast.description}
                    </p>
                  )}
                  <p className={styles.muted}>
                    {episodeMeta(
                      podcast.season,
                      podcast.episodeNumber,
                      podcast.duration
                    )}
                  </p>
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

      <ContentModal open={listOpen} title="Podcasts" onClose={() => setListOpen(false)}>
        <PodcastsList
          page={listPage}
          onPageChange={setListPage}
          onSelect={(item) => {
            setListOpen(false)
            setActive(item)
          }}
        />
      </ContentModal>

      {active && <PodcastModal item={active} onClose={() => setActive(null)} />}
    </>
  )
}
