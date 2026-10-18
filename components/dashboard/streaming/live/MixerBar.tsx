'use client'

import type { MicSnapshot } from '@/lib/live-console/types'
import { VuMeter } from './VuMeter'

interface Props {
  crossfader: number
  onCrossfader: (value: number) => void
  masterDb: number
  onMasterDb: (value: number) => void
  masterLevelDb: number
  mic: MicSnapshot
  onEnableMic: () => Promise<boolean>
  onDisableMic: () => void
  onMicGain: (value: number) => void
  onTalkover: (value: boolean) => void
  onMicCue: (value: boolean) => void
}

export function MixerBar({
  crossfader,
  onCrossfader,
  masterDb,
  onMasterDb,
  masterLevelDb,
  mic,
  onEnableMic,
  onDisableMic,
  onMicGain,
  onTalkover,
  onMicCue,
}: Props) {
  return (
    <section className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft md:grid-cols-[1.2fr_1fr]">
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Crossfader</span>
            <span className="font-mono text-foreground">{Math.round(crossfader * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={crossfader}
            onChange={(event) => onCrossfader(Number(event.target.value))}
            className="h-2 w-full cursor-pointer accent-[var(--brand-500)]"
          />
          <div className="mt-1 flex justify-between text-[10px] font-medium text-muted-foreground">
            <span>A</span>
            <span>B</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Master</span>
            <span className="font-mono text-foreground">{masterDb > 0 ? '+' : ''}{masterDb.toFixed(1)} dB</span>
          </div>
          <input
            type="range"
            min={-40}
            max={6}
            step={0.5}
            value={masterDb}
            onChange={(event) => onMasterDb(Number(event.target.value))}
            className="mt-2 h-1.5 w-full cursor-pointer accent-[var(--brand-500)]"
          />
          <div className="mt-3">
            <VuMeter db={masterLevelDb} label="Nivel de programa" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-foreground">Micrófono</h3>
            <p className="text-[10px] text-muted-foreground">
              {mic.permission === 'denied'
                ? 'Permiso denegado'
                : mic.permission === 'unavailable'
                  ? 'No disponible'
                  : mic.enabled
                    ? 'Activo'
                    : 'Apagado'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (mic.enabled) onDisableMic()
              else void onEnableMic()
            }}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${
              mic.enabled ? 'bg-red-500/15 text-red-300' : 'bg-secondary text-foreground hover:text-brand'
            }`}
          >
            {mic.enabled ? 'Apagar' : 'Encender'}
          </button>
        </div>

        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Ganancia</span>
            <span className="font-mono text-foreground">{mic.gain > 0 ? '+' : ''}{mic.gain.toFixed(1)} dB</span>
          </div>
          <input
            type="range"
            min={-30}
            max={12}
            step={0.5}
            value={mic.gain}
            onChange={(event) => onMicGain(Number(event.target.value))}
            className="h-1.5 w-full cursor-pointer accent-[var(--brand-500)]"
          />
        </div>

        <div className="mt-3">
          <VuMeter db={mic.levelDb} label="Nivel de micrófono" compact />
        </div>

        <div className="mt-3 space-y-2 text-[11px] text-muted-foreground">
          <label className="flex items-center justify-between gap-2">
            <span>Talkover automático</span>
            <input
              type="checkbox"
              checked={mic.talkover}
              onChange={(event) => onTalkover(event.target.checked)}
              className="h-4 w-4 accent-[var(--brand-500)]"
            />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span>Sidetone en auriculares</span>
            <input
              type="checkbox"
              onChange={(event) => onMicCue(event.target.checked)}
              className="h-4 w-4 accent-[var(--brand-500)]"
            />
          </label>
        </div>

        <p className="mt-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-2.5 py-2 text-[10px] leading-relaxed text-yellow-200/80">
          Usá auriculares. El programa no se reproduce por los parlantes para evitar acoples.
        </p>
      </div>
    </section>
  )
}
