'use client'

import {
  BackwardIcon,
  ForwardIcon,
  MicrophoneIcon,
  PauseIcon,
  PlayIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline'
import { formatTime } from '@/lib/live-console/audio-math'
import type { LocalTrack, MicSnapshot } from '@/lib/live-console/types'
import { VuMeter } from './VuMeter'

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
  const progress = Math.max(0, Math.min(position, duration || 0))

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void onPrevious()}
            className="rounded-full border border-border p-2.5 text-muted-foreground transition-colors hover:text-foreground"
            title="Tema anterior"
            aria-label="Tema anterior"
          >
            <BackwardIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => (playing ? onPause() : void onPlay())}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white transition-opacity hover:opacity-90"
            title={playing ? 'Pausar' : 'Reproducir'}
            aria-label={playing ? 'Pausar' : 'Reproducir'}
          >
            {playing ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => void onNext()}
            className="rounded-full border border-border p-2.5 text-muted-foreground transition-colors hover:text-foreground"
            title="Tema siguiente"
            aria-label="Tema siguiente"
          >
            <ForwardIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {current?.title || 'Sin tema en reproducción'}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {current?.artist || (current ? 'Artista desconocido' : 'Elegí un archivo o armá la lista')}
                {nextTrack && (
                  <span className="ml-2 text-muted-foreground/70">
                    · Siguiente: <span className="text-foreground/80">{nextTrack.title}</span>
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
            aria-label="Posición del tema"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <button
            type="button"
            onClick={() => {
              if (mic.enabled) onDisableMic()
              else void onEnableMic()
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium transition-colors ${
              mic.enabled ? 'bg-red-500/15 text-red-300' : 'bg-secondary text-foreground hover:text-brand'
            }`}
            title={mic.enabled ? 'Apagar micrófono' : 'Encender micrófono'}
          >
            <MicrophoneIcon className="h-3.5 w-3.5" />
            {mic.enabled ? 'Mic ON' : 'Mic OFF'}
          </button>
          <input
            type="range"
            min={-30}
            max={12}
            step={0.5}
            value={mic.gain}
            onChange={(event) => onMicGain(Number(event.target.value))}
            className="h-1.5 w-20 cursor-pointer accent-[var(--brand-500)]"
            title="Ganancia del micrófono"
            aria-label="Ganancia del micrófono"
          />
          <div className="w-24">
            <VuMeter db={mic.levelDb} compact />
          </div>
          <button
            type="button"
            onClick={() => onMonitor(!monitorEnabled)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium transition-colors ${
              monitorEnabled ? 'bg-brand/15 text-brand' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
            title="Escuchar el programa por auriculares"
          >
            <SpeakerWaveIcon className="h-3.5 w-3.5" />
            Monitor {monitorEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </section>
  )
}
