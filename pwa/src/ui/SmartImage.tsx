import { useEffect, useState } from 'react'
import { buildImageUrl } from '@/core/api'
import styles from './SmartImage.module.css'

interface SmartImageProps {
  src?: string | null
  alt: string
  fallbacks?: Array<string | null | undefined>
  className?: string
  /** Hace un fundido cruzado cuando cambia la fuente (por defecto, corte seco). */
  crossfade?: boolean
}

interface ImageState {
  index: number
  failed: boolean
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)]
}

export function SmartImage({
  src,
  alt,
  fallbacks,
  className,
  crossfade = false
}: SmartImageProps) {
  const chain = unique(
    [
      buildImageUrl(src),
      ...(fallbacks ?? []).map((item) => buildImageUrl(item))
    ].filter((item): item is string => Boolean(item))
  )

  const [state, setState] = useState<ImageState>({ index: 0, failed: false })
  const [firstUrl, setFirstUrl] = useState<string | null>(chain[0] ?? null)

  if (firstUrl !== (chain[0] ?? null)) {
    setFirstUrl(chain[0] ?? null)
    setState({ index: 0, failed: false })
  }

  // Si todas las fuentes fallaron, reintentar cuando vuelva la conexión.
  useEffect(() => {
    if (!state.failed) return
    const onOnline = () => setState((prev) => (prev.failed ? { index: 0, failed: false } : prev))
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [state.failed])

  const current = state.failed ? null : chain[state.index] ?? null

  const advance = () =>
    setState((prev) => {
      if (prev.index < chain.length - 1) {
        return { index: prev.index + 1, failed: false }
      }
      return { index: prev.index, failed: true }
    })

  if (crossfade) {
    return <CrossfadeImage src={current} alt={alt} className={className} onError={advance} />
  }

  if (state.failed) return null

  if (!current) return null

  return (
    <img
      className={className}
      src={current}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={advance}
    />
  )
}

interface CrossfadeImageProps {
  src: string | null
  alt: string
  className?: string
  onError: () => void
}

function CrossfadeImage({ src, alt, className, onError }: CrossfadeImageProps) {
  const [displayed, setDisplayed] = useState<string | null>(src)
  const [incoming, setIncoming] = useState<string | null>(null)
  const [shown, setShown] = useState(false)

  // Al cambiar la fuente, prepara la capa entrante. Si no hay base, se muestra directo.
  useEffect(() => {
    if (!src) return
    if (!displayed) {
      setDisplayed(src)
      return
    }
    if (src !== displayed && src !== incoming) {
      setIncoming(src)
      setShown(false)
    }
  }, [src, displayed, incoming])

  // Cuando la capa entrante terminó de aparecer, se promueve a base.
  useEffect(() => {
    if (!incoming || !shown) return
    const timer = setTimeout(() => {
      setDisplayed(incoming)
      setIncoming(null)
      setShown(false)
    }, 320)
    return () => clearTimeout(timer)
  }, [incoming, shown])

  if (!displayed && !incoming) return null

  return (
    <span className={styles.wrap}>
      {displayed && (
        <img
          className={className}
          src={displayed}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => {
            onError()
            setDisplayed(null)
          }}
        />
      )}
      {incoming && (
        <img
          className={`${className ?? ''} ${styles.incoming} ${shown ? styles.shown : ''}`}
          src={incoming}
          alt=""
          aria-hidden="true"
          decoding="async"
          onLoad={() => setShown(true)}
          onError={() => {
            setIncoming(null)
            setShown(false)
            onError()
          }}
        />
      )}
    </span>
  )
}
