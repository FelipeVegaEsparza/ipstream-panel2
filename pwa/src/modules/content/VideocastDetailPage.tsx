import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { buildImageUrl, getVideocastById, isNotFoundError } from '@/core/api'
import { useTenant } from '@/core/config/TenantContext'
import { ErrorScreen } from '@/app/ErrorScreen'
import { SmartImage, Skeleton } from '@/ui'
import { isDirectMediaFile, videoEmbedUrl } from '@/modules/videos/embed'
import { episodeMeta } from './format'
import styles from './content.module.css'

export function VideocastDetailPage() {
  const { id } = useParams()
  const tenant = useTenant()
  const clientId = tenant.status === 'ready' ? tenant.clientId : null

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['videocast', clientId, id],
    queryFn: () => getVideocastById(clientId!, id!),
    enabled: Boolean(clientId && id),
    retry: false
  })

  if (isError) {
    if (isNotFoundError(error)) {
      return (
        <ErrorScreen
          title="Episodio no encontrado"
          message="El videocast que buscas no está disponible."
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

  const videoUrl = data.videoUrl ? buildImageUrl(data.videoUrl) : null
  const embedUrl = videoUrl ? videoEmbedUrl(videoUrl) : null
  const isDirectFile = Boolean(videoUrl && isDirectMediaFile(videoUrl))

  return (
    <article>
      <h1 className={styles.sectionTitle}>{data.title}</h1>
      <p className={styles.muted}>
        {episodeMeta(data.season, data.episodeNumber, data.duration)}
      </p>
      {embedUrl ? (
        <div className={styles.video} style={{ position: 'relative' }}>
          <iframe
            src={embedUrl}
            title={data.title}
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
      ) : null}
      <SmartImage className={styles.media} src={data.imageUrl} alt={data.title} />
      <p className={styles.sectionBody}>{data.description}</p>
    </article>
  )
}
