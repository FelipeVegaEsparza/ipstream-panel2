import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { asArray } from '@/core/adapters'
import { getNewsBySlug } from '@/core/api'
import { useTenant } from '@/core/config/TenantContext'
import type { News } from '@/core/types'
import { Card, ContentModal, Grid, Section, Skeleton, SmartImage } from '@/ui'
import { ShareModal } from '@/modules/share/ShareModal'
import type { SectionDataProps } from './format'
import { formatDate } from './format'
import { NewsList } from './NewsList'
import styles from './content.module.css'
import newsStyles from './NewsSection.module.css'

interface NewsSectionProps extends SectionDataProps {
  variant?: 'grid' | 'featured' | 'rows' | 'overlay'
}

export function NewsSection({
  clientData,
  isLoading,
  variant = 'grid'
}: NewsSectionProps) {
  const news = asArray(clientData?.news)
  const [active, setActive] = useState<News | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const [listPage, setListPage] = useState(1)
  const [featured, ...rest] = news

  const close = useCallback(() => setActive(null), [])

  const renderFeatured = () => (
    <div className={newsStyles.layout}>
      {featured && (
        <article className={newsStyles.featured}>
          <button
            type="button"
            className={newsStyles.openCard}
            onClick={() => setActive(featured)}
            aria-label={`Abrir noticia ${featured.name}`}
          >
            <SmartImage
              className={newsStyles.featuredMedia}
              src={featured.imageUrl}
              alt={featured.name}
            />
            <div className={newsStyles.featuredBody}>
              {featured.category && (
                <span className={styles.category}>{featured.category.name}</span>
              )}
              <h3 className={newsStyles.featuredTitle}>{featured.name}</h3>
              <p className={styles.muted}>{formatDate(featured.createdAt)}</p>
            </div>
          </button>
        </article>
      )}

      {rest.length > 0 && (
        <div className={newsStyles.side}>
          {rest.slice(0, 3).map((item) => (
            <Card key={item.id} className={newsStyles.sideCard}>
              <button
                type="button"
                className={newsStyles.openSide}
                onClick={() => setActive(item)}
                aria-label={`Abrir noticia ${item.name}`}
              >
                <SmartImage
                  className={newsStyles.sideMedia}
                  src={item.imageUrl}
                  alt={item.name}
                />
                <div className={newsStyles.sideBody}>
                  {item.category && (
                    <span className={styles.category}>{item.category.name}</span>
                  )}
                  <h3 className={styles.itemTitle}>{item.name}</h3>
                  <p className={styles.muted}>{formatDate(item.createdAt)}</p>
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  const renderRows = () => (
    <div className={newsStyles.rows}>
      {news.map((item) => (
        <article key={item.id} className={newsStyles.rowCard}>
          <button
            type="button"
            className={newsStyles.rowOpen}
            onClick={() => setActive(item)}
            aria-label={`Abrir noticia ${item.name}`}
          >
            {item.imageUrl ? (
              <SmartImage className={newsStyles.rowMedia} src={item.imageUrl} alt={item.name} />
            ) : (
              <span className={newsStyles.rowMediaEmpty} aria-hidden="true" />
            )}
            <span className={newsStyles.rowBody}>
              {item.category && (
                <span className={styles.category}>{item.category.name}</span>
              )}
              <span className={newsStyles.rowTitle}>{item.name}</span>
              <span className={styles.muted}>{formatDate(item.createdAt)}</span>
            </span>
            <span className={newsStyles.rowArrow} aria-hidden="true">
              ›
            </span>
          </button>
        </article>
      ))}
    </div>
  )

  const renderOverlay = () => (
    <div className={newsStyles.overlayGrid}>
      {news.map((item) => (
        <button
          key={item.id}
          type="button"
          className={newsStyles.overlayCard}
          onClick={() => setActive(item)}
          aria-label={`Abrir noticia ${item.name}`}
        >
          <SmartImage className={newsStyles.overlayMedia} src={item.imageUrl} alt={item.name} />
          <span className={newsStyles.overlayScrim} aria-hidden="true" />
          <span className={newsStyles.overlayBody}>
            {item.category && (
              <span className={newsStyles.overlayCategory}>{item.category.name}</span>
            )}
            <span className={newsStyles.overlayTitle}>{item.name}</span>
            <span className={newsStyles.overlayMeta}>{formatDate(item.createdAt)}</span>
          </span>
        </button>
      ))}
    </div>
  )

  const renderGrid = () => (
    <Grid>
      {news.map((item) => (
        <Card key={item.id}>
          <button
            type="button"
            className={styles.cardButton}
            onClick={() => setActive(item)}
            aria-label={`Abrir noticia ${item.name}`}
          >
            <SmartImage className={styles.media} src={item.imageUrl} alt={item.name} />
            <div className={styles.body}>
              {item.category && (
                <span className={styles.category}>{item.category.name}</span>
              )}
              <h3 className={styles.itemTitle}>{item.name}</h3>
              <p className={styles.muted}>{formatDate(item.createdAt)}</p>
            </div>
          </button>
        </Card>
      ))}
    </Grid>
  )

  return (
    <>
      <Section title="Noticias" visible={news.length > 0} loading={isLoading}>
        {variant === 'featured'
          ? renderFeatured()
          : variant === 'rows'
            ? renderRows()
            : variant === 'overlay'
              ? renderOverlay()
              : renderGrid()}
        <p>
          <button
            type="button"
            className={styles.seeAll}
            onClick={() => setListOpen(true)}
          >
            Ver todas →
          </button>
        </p>
      </Section>

      <ContentModal
        open={listOpen}
        title="Noticias"
        onClose={() => setListOpen(false)}
      >
        <NewsList
          page={listPage}
          onPageChange={setListPage}
          onSelect={(item) => {
            setListOpen(false)
            setActive(item)
          }}
        />
      </ContentModal>

      {active && <NewsModal item={active} onClose={close} />}
    </>
  )
}

interface NewsModalProps {
  item: News
  onClose: () => void
}

function NewsModal({ item, onClose }: NewsModalProps) {
  const tenant = useTenant()
  const clientId = tenant.status === 'ready' ? tenant.clientId : null
  const [shareOpen, setShareOpen] = useState(false)

  const { data: full, isFetching } = useQuery({
    queryKey: ['news', clientId, item.slug],
    queryFn: () => getNewsBySlug(clientId!, item.slug),
    enabled: Boolean(clientId && item.slug),
    retry: false
  })

  const news = full ?? item
  const shareUrl = `${window.location.origin}/noticias/${item.slug}`

  useEffect(() => {
    if (shareOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shareOpen, onClose])

  return (
    <div className={newsStyles.overlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={newsStyles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={newsStyles.modalHeader}>
          <span className={styles.muted}>{formatDate(news.createdAt)}</span>
          <button
            type="button"
            className={newsStyles.close}
            onClick={onClose}
            aria-label="Cerrar noticia"
          >
            ×
          </button>
        </div>

        <SmartImage
          className={newsStyles.modalMedia}
          src={news.imageUrl}
          alt={news.name}
        />

        <div className={newsStyles.modalBody}>
          {news.category && (
            <span className={styles.category}>{news.category.name}</span>
          )}
          <h3 className={newsStyles.modalTitle}>{news.name}</h3>

          {isFetching && !full ? (
            <Skeleton rows={5} />
          ) : (
            <p className={styles.sectionBody}>
              {news.longText || news.shortText || 'Sin contenido disponible.'}
            </p>
          )}

          <div className={newsStyles.modalActions}>
            <button
              type="button"
              className={newsStyles.share}
              onClick={() => setShareOpen(true)}
            >
              Compartir
            </button>
          </div>
        </div>
      </div>

      <div onClick={(event) => event.stopPropagation()}>
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          title={news.name}
          url={shareUrl}
        />
      </div>
    </div>
  )
}
