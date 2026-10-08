import { Section, SmartImage } from '@/ui'
import type { HistoryTrack } from './useSongHistory'
import styles from './SongHistorySection.module.css'

interface SongHistorySectionProps {
  tracks: HistoryTrack[]
}

export function SongHistorySection({ tracks }: SongHistorySectionProps) {
  return (
    <Section
      title="Canciones sonadas"
      bgText="HISTORIAL"
      visible={tracks.length > 0}
    >
      <ul className={styles.list}>
        {tracks.map((track) => (
          <li key={track.key} className={styles.item}>
            <SmartImage className={styles.cover} src={track.coverUrl} alt="" />
            <div className={styles.meta}>
              <span className={styles.title}>{track.title}</span>
              <span className={styles.artist}>{track.artist}</span>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}
