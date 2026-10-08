import { useEffect } from 'react'
import { asArray, normalizePagination } from '@/core/adapters'
import { getVideocasts } from '@/core/api'
import { useTenant } from '@/core/config/TenantContext'
import { usePaginatedList } from '@/core/hooks/usePaginatedList'
import type { Videocast } from '@/core/types'
import { ErrorScreen } from '@/app/ErrorScreen'
import { Card, EmptyState, Grid, Pagination, Skeleton, SmartImage } from '@/ui'
import styles from './content.module.css'

interface VideocastsListProps {
  page: number
  onPageChange: (page: number) => void
  onSelect: (item: Videocast) => void
}

export function VideocastsList({ page, onPageChange, onSelect }: VideocastsListProps) {
  const tenant = useTenant()
  const clientId = tenant.status === 'ready' ? tenant.clientId : null

  const { data, isLoading, isError, isPlaceholderData, refetch } = usePaginatedList(
    clientId,
    'videocastsList',
    (p, limit) => getVideocasts(clientId!, p, limit),
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
        title="No se pudieron cargar los videocasts"
        message="Hubo un problema de conexión. Revisa tu conexión e inténtalo de nuevo."
        onRetry={() => void refetch()}
      />
    )
  }

  if (items.length === 0) {
    return <EmptyState message="No hay videocasts disponibles." />
  }

  return (
    <>
      <Grid>
        {items.map((videocast) => (
          <Card key={videocast.id}>
            <button
              type="button"
              className={styles.cardButton}
              onClick={() => onSelect(videocast)}
              aria-label={`Abrir videocast ${videocast.title}`}
            >
              <SmartImage className={styles.media} src={videocast.imageUrl} alt={videocast.title} />
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
