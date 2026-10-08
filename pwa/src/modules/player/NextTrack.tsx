import type { StreamingTrack } from '@/core/types'
import { SmartImage } from '@/ui'
import styles from './NextTrack.module.css'

interface NextTrackProps {
  next: StreamingTrack | null | undefined
  fallbackCover?: string | null | undefined
  variant?: 'compact' | 'large'
}

function formatTime(totalSeconds: number | null | undefined): string {
  if (!totalSeconds || totalSeconds <= 0) return ''
  const secs = Math.floor(totalSeconds)
  const minutes = Math.floor(secs / 60)
  const seconds = secs % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function NextTrack({
  next,
  fallbackCover,
  variant = 'compact'
}: NextTrackProps) {
  if (!next) return null

  const large = variant === 'large'

  return (
    <div className={large ? styles.nextLarge : styles.next}>
      <SmartImage
        className={large ? styles.thumbLarge : styles.thumb}
        src={next.coverUrl}
        fallbacks={[fallbackCover]}
        alt=""
      />
      <div className={large ? styles.infoLarge : styles.info}>
        <span className={styles.label}>A continuación</span>
        <span className={large ? styles.titleLarge : styles.title}>
          {next.title}
        </span>
        <span className={styles.artist}>
          {next.artist}
          {large && formatTime(next.duration)
            ? ` · ${formatTime(next.duration)}`
            : ''}
        </span>
      </div>
    </div>
  )
}
