import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { buildImageUrl, getPodcastById, isNotFoundError } from '@/core/api'
import { useTenant } from '@/core/config/TenantContext'
import { ErrorScreen } from '@/app/ErrorScreen'
import { SmartImage, Skeleton } from '@/ui'
import { episodeMeta } from './format'
import styles from './content.module.css'

export function PodcastDetailPage() {
  const { id } = useParams()
  const tenant = useTenant()
  const clientId = tenant.status === 'ready' ? tenant.clientId : null

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['podcast', clientId, id],
    queryFn: () => getPodcastById(clientId!, id!),
    enabled: Boolean(clientId && id),
    retry: false
  })

  if (isError) {
    if (isNotFoundError(error)) {
      return (
        <ErrorScreen
          title="Episodio no encontrado"
          message="El podcast que buscas no está disponible."
        />
      )
    }
    return (
      <ErrorScreen
        title="No pudimos cargar el episodio"
        message="Hubo un problema de conexión con el servidor. Revisa tu conexión e inténtalo de nuevo."
        onRetry={() => void refetch()}
      />
    )
  }

  if (isLoading || !data) {
    return <Skeleton rows={6} />
  }

  const audioUrl = buildImageUrl(data.audioUrl)

  return (
    <article>
      <h1 className={styles.sectionTitle}>{data.title}</h1>
      <p className={styles.muted}>
        {episodeMeta(data.season, data.episodeNumber, data.duration)}
      </p>
      <SmartImage className={styles.media} src={data.imageUrl} alt={data.title} />
      <p className={styles.sectionBody}>{data.description}</p>
      {audioUrl && (
        <audio className={styles.audio} controls src={audioUrl} preload="none" />
      )}
    </article>
  )
}
