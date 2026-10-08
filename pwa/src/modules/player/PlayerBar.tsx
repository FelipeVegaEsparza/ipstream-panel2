import { useTenant } from '@/core/config/TenantContext'
import { useStreaming } from '@/core/hooks/useStreaming'
import { SmartImage } from '@/ui'
import { usePlayer } from './PlayerContext'
import { TrackProgress } from './TrackProgress'
import { VuMeter } from './VuMeter'
import styles from './PlayerBar.module.css'

interface PlayerBarProps {
  /** Covers alternativos (portada de la radio/logo) si el tema no trae portada. */
  fallbackCovers?: Array<string | null | undefined>
  /** Dibuja el VU meter como fondo del reproductor. */
  vuMeter?: boolean
}

export function PlayerBar({ fallbackCovers, vuMeter = false }: PlayerBarProps = {}) {
  const { streamUrl, isPlaying, toggle } = usePlayer()
  const tenant = useTenant()
  const clientId = tenant.status === 'ready' ? tenant.clientId : null
  const { data: streaming } = useStreaming(clientId ?? '')

  const currentTrack = streaming?.currentTrack
  const nextTrack = streaming?.nextTrack
  const trackCover = currentTrack?.coverUrl ?? null
  const trackKey =
    trackCover ?? `${currentTrack?.title ?? ''}|${currentTrack?.artist ?? ''}`
  const hasCoverInput = Boolean(trackCover || fallbackCovers?.some(Boolean))

  const status = streaming?.status ?? 'off'
  const onAir = status !== 'off'
  const statusText = !onAir
    ? 'Fuera del aire'
    : streaming?.isLive
      ? 'EN VIVO'
      : 'Al aire'

  return (
    <div className={styles.bar}>
      {vuMeter && <VuMeter className={styles.vuBg} bars={72} />}
      <div className={styles.inner}>
        <TrackProgress
          variant="thin"
          duration={currentTrack?.duration}
          trackKey={trackKey}
          isPlaying={isPlaying}
          serverElapsed={currentTrack?.elapsed}
        />
        <div className={styles.content}>
          <div className={styles.current}>
            {hasCoverInput ? (
              <SmartImage
                className={styles.cover}
                src={trackCover}
                fallbacks={fallbackCovers}
                alt=""
              />
            ) : (
              <div className={styles.coverPlaceholder} aria-hidden="true">
                ♪
              </div>
            )}

            <div className={styles.info}>
              <div className={styles.statusRow}>
                <span
                  className={`${styles.statusDot} ${onAir ? styles.statusDotOn : ''}`}
                  aria-hidden="true"
                />
                <span className={styles.statusText}>{statusText}</span>
                {streaming?.listeners ? (
                  <span className={styles.statusMeta}>· {streaming.listeners} oyentes</span>
                ) : null}
                {streaming?.bitrate ? (
                  <span className={styles.statusMeta}>· {streaming.bitrate} kbps</span>
                ) : null}
              </div>
              <span className={styles.label}>
                {currentTrack?.title || 'En Vivo'}
              </span>
              <span className={styles.meta}>
                {currentTrack?.artist ||
                  (streamUrl ? 'Reproduciendo en vivo' : 'Reproductor listo')}
              </span>
            </div>
          </div>

          <button
            type="button"
            className={styles.playButton}
            onClick={toggle}
            disabled={!streamUrl}
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>

          {nextTrack ? (
            <div className={styles.next}>
              <span className={styles.nextLabel}>Sigue ahora</span>
              <span className={styles.nextTitle}>{nextTrack.title}</span>
              {nextTrack.artist && (
                <span className={styles.nextArtist}>{nextTrack.artist}</span>
              )}
            </div>
          ) : (
            <div aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  )
}
