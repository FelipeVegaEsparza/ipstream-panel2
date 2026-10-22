'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { ArrowPathIcon, PlusIcon, SpeakerWaveIcon, StopIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { SOUND_EFFECT_PAD_SIZES, type SoundEffect } from '@/lib/live-console/effects'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Props {
  padSize: number
  slots: (SoundEffect | null)[]
  loading: boolean
  error: string | null
  libraryMode?: boolean
  manageHref?: string
  compact?: boolean
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
  libraryMode = false,
  manageHref,
  compact = false,
  onPadSize,
  onAdd,
  onRemove,
  onGain,
  onPlay,
  onStopAll,
}: Props) {
  const { t } = useDashboardI18n()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [pendingSlot, setPendingSlot] = useState<number | null>(null)

  const openPicker = (slot: number) => {
    setPendingSlot(slot)
    inputRef.current?.click()
  }

  return (
    <section className={`min-h-0 rounded-lg border border-border bg-card shadow-soft ${compact ? 'p-2' : 'p-3'}`}>
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between ${compact ? 'gap-1.5' : 'gap-3'}`}>
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <SpeakerWaveIcon className="h-4 w-4 text-brand" />
            {t('live.effects.title')}
          </h2>
          {!compact && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {libraryMode
                ? t('live.effects.subtitleLibrary')
                : t('live.effects.subtitleBrowser')}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {manageHref && (
            <Link
              href={manageHref}
              className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-brand hover:text-brand"
            >
              {t('live.effects.choose')}
            </Link>
          )}
          {loading && <span className="text-[10px] text-muted-foreground">{t('live.effects.loading')}</span>}
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {t('live.effects.buttons')}
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
            title={t('live.effects.stopAll')}
          >
            <StopIcon className="h-3.5 w-3.5" />
            {t('live.effects.stop')}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
          {error}
        </p>
      )}

      <div className={`mt-2 grid gap-1.5 ${compact ? 'max-h-[92px] grid-cols-4 overflow-y-auto md:grid-cols-8' : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8'}`}>
        {slots.map((effect, slot) => (
          <div key={slot} className="min-w-0">
            {effect ? (
              <button
                type="button"
                onClick={() => void onPlay(slot)}
                className={`flex w-full flex-col items-center justify-center gap-0.5 rounded border border-brand/30 bg-brand/10 px-1.5 text-center transition-colors hover:bg-brand/15 ${compact ? 'h-12' : 'h-16'}`}
                title={t('live.effects.play', { name: effect.name })}
              >
                <SpeakerWaveIcon className="h-4 w-4 text-brand" />
                <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-brand">{effect.name}</span>
                <span className="text-[9px] text-muted-foreground">{t('live.effects.button', { n: slot + 1 })}</span>
              </button>
            ) : libraryMode ? (
              <div className={`flex w-full flex-col items-center justify-center gap-0.5 rounded border border-dashed border-border bg-background px-1.5 text-center text-muted-foreground ${compact ? 'h-12' : 'h-16'}`}>
                <span className="text-[11px] font-medium">{t('live.effects.empty')}</span>
                <span className="text-[9px]">{t('live.effects.button', { n: slot + 1 })}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openPicker(slot)}
                className={`flex w-full flex-col items-center justify-center gap-0.5 rounded border border-dashed border-border bg-background px-1.5 text-center transition-colors hover:border-brand hover:text-brand ${compact ? 'h-12' : 'h-16'}`}
              >
                <PlusIcon className="h-4 w-4" />
                <span className="text-[11px] font-medium">{t('live.effects.add')}</span>
                <span className="text-[9px] text-muted-foreground">{t('live.effects.button', { n: slot + 1 })}</span>
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
                  title={t('live.effects.volume', { db: effect.gainDb.toFixed(1) })}
                  aria-label={t('live.effects.volumeLabel', { name: effect.name })}
                />
                {!libraryMode && (
                  <>
                    <button
                      type="button"
                      onClick={() => openPicker(slot)}
                      className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                      title={t('live.effects.change')}
                      aria-label={`${t('live.effects.change')} ${effect.name}`}
                    >
                      <ArrowPathIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void onRemove(slot)}
                      className="rounded-md p-1 text-muted-foreground hover:text-red-400"
                      title={t('live.effects.remove')}
                      aria-label={t('live.effects.removeLabel', { name: effect.name })}
                    >
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {!libraryMode && (
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
      )}
    </section>
  )
}
