import { useEffect } from 'react'
import { asArray, normalizePagination } from '@/core/adapters'
import { getPodcasts } from '@/core/api'
import { useTenant } from '@/core/config/TenantContext'
import { usePaginatedList } from '@/core/hooks/usePaginatedList'
import type { Podcast } from '@/core/types'
import { ErrorScreen } from '@/app/ErrorScreen'
import { Card, EmptyState, Grid, Pagination, Skeleton, SmartImage } from '@/ui'
import { episodeMeta } from './format'
import styles from './content.module.css'

interface PodcastsListProps {
  page: number
  onPageChange: (page: number) => void
  onSelect: (item: Podcast) => void
}

export function PodcastsList({ page, onPageChange, onSelect }: PodcastsListProps) {
  const tenant = useTenant()
  const clientId = tenant.status === 'ready' ? tenant.clientId : null

  const { data, isLoading, isError, isPlaceholderData, refetch } = usePaginatedList(
    clientId,
    'podcastsList',
    (p, limit) => getPodcasts(clientId!, p, limit),
    page
  )

  const items = asArray(data?.data)
  const pagination = normalizePagination(data?.pagination)

  // Si el dataset encogió y la página quedó fuera de rango, volver a la última válida.
  useEffect(() => {
    if (!isPlaceholderData && data && pagination.pages > 0 && page > pagination.pages) {
      onPageChange(pagination.pages)
    }
  }, [page, data, pagination.pages, isPlaceholderData, onPageChange])

  if (isLoading && items.length === 0) {
    return <Skeleton rows={6} />
  }

  if (isError) {
    return (
      <ErrorScreen
        title="No se pudieron cargar los podcasts"
        message="Hubo un problema de conexión. Revisa tu conexión e inténtalo de nuevo."
        onRetry={() => void refetch()}
      />
    )
  }

  if (items.length === 0) {
    return <EmptyState message="No hay podcasts disponibles." />
  }

  return (
    <>
      <Grid>
        {items.map((podcast) => (
          <Card key={podcast.id}>
            <button
              type="button"
              className={styles.cardButton}
              onClick={() => onSelect(podcast)}
              aria-label={`Abrir podcast ${podcast.title}`}
            >
              <SmartImage className={styles.media} src={podcast.imageUrl} alt={podcast.title} />
              <div className={styles.body}>
                <h3 className={styles.itemTitle}>{podcast.title}</h3>
                {podcast.description && (
                  <p className={`${styles.muted} ${styles.clamp}`}>
                    {podcast.description}
                  </p>
                )}
                <p className={styles.muted}>
                  {episodeMeta(podcast.season, podcast.episodeNumber, podcast.duration)}
                </p>
              </div>
            </button>
          </Card>
        ))}
      </Grid>
      {pagination.total > 0 && (
        <Pagination
          page={page}
          totalPages={pagination.pages}
          hasMore={pagination.hasMore}
          onPageChange={onPageChange}
        />
      )}
    </>
  )
}
