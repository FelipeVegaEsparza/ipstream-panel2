import { useEffect } from 'react'
import { asArray, normalizePagination } from '@/core/adapters'
import { getNews } from '@/core/api'
import { useTenant } from '@/core/config/TenantContext'
import { usePaginatedList } from '@/core/hooks/usePaginatedList'
import type { News } from '@/core/types'
import { ErrorScreen } from '@/app/ErrorScreen'
import { Card, EmptyState, Grid, Pagination, Skeleton, SmartImage } from '@/ui'
import { formatDate } from './format'
import styles from './content.module.css'

interface NewsListProps {
  page: number
  onPageChange: (page: number) => void
  onSelect: (item: News) => void
}

export function NewsList({ page, onPageChange, onSelect }: NewsListProps) {
  const tenant = useTenant()
  const clientId = tenant.status === 'ready' ? tenant.clientId : null

  const { data, isLoading, isError, isPlaceholderData, refetch } = usePaginatedList(
    clientId,
    'newsList',
    (p, limit) => getNews(clientId!, p, limit),
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
        title="No se pudieron cargar las noticias"
        message="Hubo un problema de conexión. Revisa tu conexión e inténtalo de nuevo."
        onRetry={() => void refetch()}
      />
    )
  }

  if (items.length === 0) {
    return <EmptyState message="No hay noticias disponibles." />
  }

  return (
    <>
      <Grid>
        {items.map((item) => (
          <Card key={item.id}>
            <button
              type="button"
              className={styles.cardButton}
              onClick={() => onSelect(item)}
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
