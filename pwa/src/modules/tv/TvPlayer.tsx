import { useRef } from 'react'
import { useHlsVideo } from './useHlsVideo'
import styles from './TvPlayer.module.css'

interface TvPlayerProps {
  src: string
  className?: string
  autoPlay?: boolean
  /** Limita y centra el reproductor para usarlo como hero en pantallas grandes. */
  hero?: boolean
}

/** Reproductor de TV en vivo (HLS) reutilizable por la sección y los templates. */
export function TvPlayer({
  src,
  className,
  autoPlay = false,
  hero = false
}: TvPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { status, muted, needsInteraction, enableSound, reload } = useHlsVideo(
    videoRef,
    src
  )

  return (
    <div className={`${styles.player} ${hero ? styles.hero : ''} ${className ?? ''}`}>
      <video
        ref={videoRef}
        className={styles.video}
        controls
        playsInline
        autoPlay={autoPlay}
      />

      {(needsInteraction || muted) && (
        <button
          type="button"
          className={styles.soundBtn}
          onClick={enableSound}
          aria-label={needsInteraction ? 'Reproducir' : 'Activar sonido'}
          aria-pressed={false}
        >
          {needsInteraction ? 'Reproducir' : 'Activar sonido'}
        </button>
      )}

      {status === 'error' && (
        <div className={styles.error} role="status">
          <p className={styles.errorText}>
            La señal no está disponible en este momento.
          </p>
          <button type="button" className={styles.retry} onClick={reload}>
            Reintentar
          </button>
        </div>
      )}
    </div>
  )
}
