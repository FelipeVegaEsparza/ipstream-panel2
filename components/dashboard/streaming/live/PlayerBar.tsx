'use client'

import {
  BackwardIcon,
  ForwardIcon,
  MicrophoneIcon,
  MusicalNoteIcon,
  PauseIcon,
  PlayIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline'
import { formatTime } from '@/lib/live-console/audio-math'
import type { LocalTrack, MicSnapshot } from '@/lib/live-console/types'
import { VuMeter } from './VuMeter'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Props {
  current: LocalTrack | null
  nextTrack: LocalTrack | null
  playing: boolean
  position: number
  duration: number
  onPlay: () => Promise<void>
  onPause: () => void
  onPrevious: () => Promise<void>
  onNext: () => Promise<void>
  onSeek: (seconds: number) => void
  mic: MicSnapshot
  onEnableMic: () => Promise<boolean>
  onDisableMic: () => void
  onMicGain: (db: number) => void
  monitorEnabled: boolean
  onMonitor: (enabled: boolean) => void
}

export function PlayerBar({
  current,
  nextTrack,
  playing,
  position,
  duration,
  onPlay,
  onPause,
  onPrevious,
  onNext,
  onSeek,
  mic,
  onEnableMic,
  onDisableMic,
  onMicGain,
  monitorEnabled,
  onMonitor,
}: Props) {
  const { t } = useDashboardI18n()
  const progress = Math.max(0, Math.min(position, duration || 0))

  return (
    <section className="rounded-xl border border-border bg-card p-3 shadow-soft">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary">
          <MusicalNoteIcon className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void onPrevious()}
            className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
            title={t('live.player.previous')}
            aria-label={t('live.player.previous')}
          >
            <BackwardIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => (playing ? onPause() : void onPlay())}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white transition-opacity hover:opacity-90"
            title={playing ? t('live.player.pause') : t('live.player.play')}
            aria-label={playing ? t('live.player.pause') : t('live.player.play')}
          >
            {playing ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => void onNext()}
            className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
            title={t('live.player.nextTrack')}
            aria-label={t('live.player.nextTrack')}
          >
            <ForwardIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="min-w-[220px] flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {current?.title || t('live.player.noTrack')}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {current?.artist || (current ? t('live.player.unknownArtist') : t('live.player.chooseFile'))}
                {nextTrack && (
                  <span className="ml-2 text-muted-foreground/70">
                    · {t('live.player.next')} <span className="text-foreground/80">{nextTrack.title}</span>
                  </span>
                )}
              </p>
            </div>
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
              {formatTime(progress)} / {formatTime(duration)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(duration, 0.001)}
            step={0.1}
            value={progress}
            onChange={(event) => onSeek(Number(event.target.value))}
            disabled={!current}
            className="mt-2 h-1.5 w-full cursor-pointer accent-[var(--brand-500)] disabled:opacity-40"
            aria-label={t('live.player.position')}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <button
            type="button"
            onClick={() => {
              if (mic.enabled) onDisableMic()
              else void onEnableMic()
            }}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
              mic.enabled ? 'bg-red-500/15 text-red-300' : 'bg-secondary text-foreground hover:text-brand'
            }`}
            title={mic.enabled ? t('live.player.micOff') : t('live.player.micOn')}
          >
            <MicrophoneIcon className="h-3.5 w-3.5" />
            {mic.enabled ? t('live.player.micOn') : t('live.player.micOff')}
          </button>
          <input
            type="range"
            min={-30}
            max={12}
            step={0.5}
            value={mic.gain}
            onChange={(event) => onMicGain(Number(event.target.value))}
            className="h-1.5 w-16 cursor-pointer accent-[var(--brand-500)]"
            title={t('live.player.micGain')}
            aria-label={t('live.player.micGain')}
          />
          <div className="w-24">
            <VuMeter db={mic.levelDb} label="Mic" compact />
          </div>
          <button
            type="button"
            onClick={() => onMonitor(!monitorEnabled)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
              monitorEnabled ? 'bg-brand/15 text-brand' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
            title={t('live.player.monitorTitle')}
          >
            <SpeakerWaveIcon className="h-3.5 w-3.5" />
            Monitor {monitorEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </section>
  )
}
