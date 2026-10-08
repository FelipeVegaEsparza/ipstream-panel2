import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { getNewsBySlug, isNotFoundError } from '@/core/api'
import { useTenant } from '@/core/config/TenantContext'
import { ErrorScreen } from '@/app/ErrorScreen'
import { SmartImage, Skeleton } from '@/ui'
import { formatDate } from './format'
import styles from './content.module.css'

export function NewsDetailPage() {
  const { slug } = useParams()
  const tenant = useTenant()
  const clientId = tenant.status === 'ready' ? tenant.clientId : null

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['news', clientId, slug],
    queryFn: () => getNewsBySlug(clientId!, slug!),
    enabled: Boolean(clientId && slug),
    retry: false
  })

  if (isError) {
    if (isNotFoundError(error)) {
      return (
        <ErrorScreen
          title="Noticia no encontrada"
          message="La noticia que buscas no está disponible."
        />
      )
    }
    return (
      <ErrorScreen
        title="No pudimos cargar la noticia"
        message="Hubo un problema de conexión con el servidor. Revisa tu conexión e inténtalo de nuevo."
        onRetry={() => void refetch()}
      />
    )
  }

  if (isLoading || !data) {
    return <Skeleton rows={6} />
  }

  return (
    <article>
      <p className={styles.muted}>{formatDate(data.createdAt)}</p>
      <h1 className={styles.sectionTitle}>{data.name}</h1>
      <SmartImage className={styles.media} src={data.imageUrl} alt={data.name} />
      <p className={styles.sectionBody}>{data.longText}</p>
    </article>
  )
}
