'use client'

import { useRef, useState } from 'react'
import { ArrowPathIcon, PlusIcon, SpeakerWaveIcon, StopIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { SOUND_EFFECT_PAD_SIZES, type SoundEffect } from '@/lib/live-console/effects'

interface Props {
  padSize: number
  slots: (SoundEffect | null)[]
  loading: boolean
  error: string | null
  onPadSize: (size: number) => void
  onAdd: (slot: number, file: File) => Promise<void>
  onRemove: (slot: number) => Promise<void>
  onGain: (slot: number, db: number) => Promise<void>
  onPlay: (slot: number) => Promise<void>
  onStopAll: () => void
}

export function SoundEffectsPad({
  padSize,
  slots,
  loading,
  error,
  onPadSize,
  onAdd,
  onRemove,
  onGain,
  onPlay,
  onStopAll,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [pendingSlot, setPendingSlot] = useState<number | null>(null)

  const openPicker = (slot: number) => {
    setPendingSlot(slot)
    inputRef.current?.click()
  }

  return (
    <section className="rounded-xl border border-border bg-card p-3 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <SpeakerWaveIcon className="h-4 w-4 text-brand" />
            Efectos de sonido
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Se guardan en este navegador y se mezclan en la transmisión al presionar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <span className="text-[10px] text-muted-foreground">Cargando…</span>}
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            Botones
            <select
              value={padSize}
              onChange={(event) => onPadSize(Number(event.target.value))}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand"
            >
              {SOUND_EFFECT_PAD_SIZES.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={onStopAll}
            className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            title="Detener todos los efectos"
          >
            <StopIcon className="h-3.5 w-3.5" />
            Detener
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
          {error}
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
        {slots.map((effect, slot) => (
          <div key={slot} className="min-w-0">
            {effect ? (
              <button
                type="button"
                onClick={() => void onPlay(slot)}
                className="flex h-16 w-full flex-col items-center justify-center gap-0.5 rounded-lg border border-brand/30 bg-brand/10 px-1.5 text-center transition-colors hover:bg-brand/15"
                title={`Reproducir ${effect.name}`}
              >
                <SpeakerWaveIcon className="h-4 w-4 text-brand" />
                <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-brand">{effect.name}</span>
                <span className="text-[9px] text-muted-foreground">Botón {slot + 1}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openPicker(slot)}
                className="flex h-16 w-full flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-border bg-background px-1.5 text-center transition-colors hover:border-brand hover:text-brand"
              >
                <PlusIcon className="h-4 w-4" />
                <span className="text-[11px] font-medium">Agregar sonido</span>
                <span className="text-[9px] text-muted-foreground">Botón {slot + 1}</span>
              </button>
            )}

            {effect && (
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="range"
                  min={-40}
                  max={6}
                  step={0.5}
                  value={effect.gainDb}
                  onChange={(event) => void onGain(slot, Number(event.target.value))}
                  className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[var(--brand-500)]"
                  title={`Volumen: ${effect.gainDb.toFixed(1)} dB`}
                  aria-label={`Volumen de ${effect.name}`}
                />
                <button
                  type="button"
                  onClick={() => openPicker(slot)}
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                  title="Cambiar sonido"
                  aria-label={`Cambiar ${effect.name}`}
                >
                  <ArrowPathIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void onRemove(slot)}
                  className="rounded-md p-1 text-muted-foreground hover:text-red-400"
                  title="Quitar efecto"
                  aria-label={`Quitar ${effect.name}`}
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.oga,.opus,.flac,.webm"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file && pendingSlot != null) void onAdd(pendingSlot, file)
          event.target.value = ''
          setPendingSlot(null)
        }}
      />
    </section>
  )
}
