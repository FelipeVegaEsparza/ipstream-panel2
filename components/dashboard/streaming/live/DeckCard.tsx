'use client'

import { formatTime, loopSecondsFromBpm } from '@/lib/live-console/audio-math'
import type { DeckEq, DeckId, DeckLoop, DeckSnapshot } from '@/lib/live-console/types'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Props {
  deck: DeckSnapshot
  cue: boolean
  disabled?: boolean
  onPlay: () => void
  onPause: () => void
  onSeek: (seconds: number) => void
  onGain: (db: number) => void
  onEq: (band: keyof DeckEq, db: number) => void
  onLoop: (loop: Partial<DeckLoop>) => void
  onClearLoop: () => void
  onToggleCue: () => void
}

function EqSlider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
      <span className="w-8 uppercase tracking-wide">{label}</span>
      <input
        type="range"
        min={-18}
        max={18}
        step={0.5}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 flex-1 cursor-pointer accent-[var(--brand-500)]"
      />
      <span className="w-10 text-right font-mono text-foreground">{value > 0 ? '+' : ''}{value.toFixed(1)}</span>
    </label>
  )
}

export function DeckCard({
  deck,
  cue,
  disabled,
  onPlay,
  onPause,
  onSeek,
  onGain,
  onEq,
  onLoop,
  onClearLoop,
  onToggleCue,
}: Props) {
  const { t } = useDashboardI18n()
  const track = deck.track
  const position = Math.min(deck.position, deck.duration || deck.position)
  const canControl = Boolean(track) && !disabled
  const loopActive = deck.loop.enabled

  const setLoopIn = () => {
    onLoop({
      start: Math.max(0, position),
      end: Math.max(position + 1, deck.loop.end || Math.min(deck.duration, position + 4)),
      enabled: false,
      quantized: false,
    })
  }

  const setLoopOut = () => {
    if (deck.loop.start >= position) return
    onLoop({ end: position, enabled: true, quantized: false })
  }

  const beatLoop = (beats: number) => {
    if (!deck.bpm) return
    const length = loopSecondsFromBpm(deck.bpm, beats)
    if (length <= 0) return
    const start = Math.max(0, position)
    onLoop({ start, end: start + length, enabled: true, quantized: true })
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-sm font-bold text-brand">
            {deck.id}
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Deck {deck.id}</h2>
            <p className="text-[11px] text-muted-foreground">
              {deck.mode === 'buffer' ? t('live.deck.ramLoops') : deck.mode === 'element' ? t('live.deck.streamLoops') : t('live.deck.noTrack')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {deck.bpm != null && (
            <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-medium text-muted-foreground">
              {deck.bpm.toFixed(1)} BPM
            </span>
          )}
          <button
            type="button"
            onClick={onToggleCue}
            disabled={!canControl}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-40 ${
              cue
                ? 'border-brand bg-brand/15 text-brand'
                : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
            }`}
            title={t('live.deck.cueTitle')}
          >
            CUE
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-background p-3">
        <p className="truncate text-sm font-medium text-foreground">
          {track ? track.title : t('live.deck.chooseTrack')}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {track?.artist || (track ? t('live.deck.unknownArtist') : '—')}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={deck.playing ? onPause : onPlay}
            disabled={!canControl}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            aria-label={deck.playing ? t('live.deck.pause') : t('live.deck.play')}
          >
            {deck.playing ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          <span className="w-12 text-right font-mono text-[11px] text-muted-foreground">{formatTime(position)}</span>
          <input
            type="range"
            min={0}
            max={Math.max(deck.duration, 0.001)}
            step={0.1}
            value={position}
            disabled={!canControl}
            onChange={(event) => onSeek(Number(event.target.value))}
            className="h-1.5 flex-1 cursor-pointer accent-[var(--brand-500)] disabled:opacity-40"
          />
          <span className="w-12 font-mono text-[11px] text-muted-foreground">{formatTime(deck.duration)}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="space-y-2 rounded-xl border border-border bg-background p-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Gain</span>
            <span className="font-mono text-foreground">{deck.gain > 0 ? '+' : ''}{deck.gain.toFixed(1)} dB</span>
          </div>
          <input
            type="range"
            min={-40}
            max={6}
            step={0.5}
            value={deck.gain}
            disabled={!canControl}
            onChange={(event) => onGain(Number(event.target.value))}
            className="h-1.5 w-full cursor-pointer accent-[var(--brand-500)] disabled:opacity-40"
          />
          <div className="space-y-1.5 pt-1">
            <EqSlider label="Low" value={deck.eq.low} onChange={(value) => onEq('low', value)} />
            <EqSlider label="Mid" value={deck.eq.mid} onChange={(value) => onEq('mid', value)} />
            <EqSlider label="High" value={deck.eq.high} onChange={(value) => onEq('high', value)} />
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-border bg-background p-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Loop</span>
            <span className="font-mono text-foreground">
              {loopActive ? `${formatTime(deck.loop.start)} → ${formatTime(deck.loop.end)}` : 'off'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={setLoopIn} disabled={!canControl} className="rounded-md bg-secondary px-2 py-1 text-[10px] text-foreground disabled:opacity-40">IN</button>
            <button type="button" onClick={setLoopOut} disabled={!canControl} className="rounded-md bg-secondary px-2 py-1 text-[10px] text-foreground disabled:opacity-40">OUT</button>
            <button
              type="button"
              onClick={() => onLoop({ enabled: !loopActive })}
              disabled={!canControl || deck.loop.end <= deck.loop.start}
              className={`rounded-md px-2 py-1 text-[10px] font-medium disabled:opacity-40 ${
                loopActive ? 'bg-brand/15 text-brand' : 'bg-secondary text-foreground'
              }`}
            >
              {loopActive ? 'LOOP ON' : 'LOOP'}
            </button>
            <button type="button" onClick={onClearLoop} disabled={!canControl} className="rounded-md bg-secondary px-2 py-1 text-[10px] text-foreground disabled:opacity-40">CLEAR</button>
          </div>
          <div className="flex flex-wrap gap-1.5 border-t border-border pt-2">
            <span className="w-full text-[10px] uppercase tracking-wide text-muted-foreground">
              {deck.bpm ? t('live.deck.byBeat') : t('live.deck.beatRequiresBpm')}
            </span>
            {[0.25, 0.5, 1, 2, 4].map((beats) => (
              <button
                key={beats}
                type="button"
                onClick={() => beatLoop(beats)}
                disabled={!canControl || !deck.bpm}
                className="rounded-md bg-secondary px-2 py-1 text-[10px] text-foreground disabled:opacity-40"
              >
                {beats === 0.25 ? '¼' : beats === 0.5 ? '½' : beats}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
