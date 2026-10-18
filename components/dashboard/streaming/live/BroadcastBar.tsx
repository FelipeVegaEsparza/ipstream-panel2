'use client'

import { ArrowPathIcon } from '@heroicons/react/24/outline'
import type { SessionState, SlotOption, TransportKind, TransportStats } from '@/lib/live-console/types'

interface Props {
  engineReady: boolean
  state: SessionState
  transport: TransportKind | null
  stats: TransportStats
  error: string | null
  slots: SlotOption[]
  maxDjs: number
  slotId: string | null
  onSlotId: (id: string | null) => void
  mount: string | null
  bitrate: number
  streamBitrate: number
  headphonesConfirmed: boolean
  onHeadphonesConfirmed: (value: boolean) => void
  onGoLive: () => Promise<void>
  onStopLive: () => Promise<void>
  onReconnect: () => Promise<void>
  onRefreshSlots: () => Promise<void>
}

const STATUS: Record<SessionState, { label: string; className: string }> = {
  idle: { label: 'Fuera del aire', className: 'bg-secondary text-muted-foreground' },
  preparing: { label: 'Preparando', className: 'bg-yellow-500/10 text-yellow-300' },
  connecting: { label: 'Conectando', className: 'bg-yellow-500/10 text-yellow-300' },
  live: { label: 'EN VIVO', className: 'bg-red-500/15 text-red-300' },
  reconnecting: { label: 'Reconectando', className: 'bg-yellow-500/10 text-yellow-300' },
  ended: { label: 'Fuera del aire', className: 'bg-secondary text-muted-foreground' },
  error: { label: 'Error', className: 'bg-red-500/15 text-red-300' },
}

export function BroadcastBar({
  engineReady,
  state,
  transport,
  stats,
  error,
  slots,
  maxDjs,
  slotId,
  onSlotId,
  mount,
  bitrate,
  streamBitrate,
  headphonesConfirmed,
  onHeadphonesConfirmed,
  onGoLive,
  onStopLive,
  onReconnect,
  onRefreshSlots,
}: Props) {
  const status = STATUS[state]
  const busy = state === 'preparing' || state === 'connecting'
  const live = state === 'live' || state === 'reconnecting'
  const selectedSlot = slots.find((item) => (item.id ?? null) === slotId)
  const slotOccupied = Boolean(selectedSlot?.connected)
  const canGoLive = engineReady && headphonesConfirmed && !busy && !live && !slotOccupied

  return (
    <section className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-soft">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>
          {live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />}
          {status.label}
        </span>

        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="hidden sm:inline">Slot</span>
          <select
            value={slotId ?? '__live__'}
            onChange={(event) => onSlotId(event.target.value === '__live__' ? null : event.target.value)}
            disabled={live || busy}
            className="max-w-[190px] rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none focus:border-brand disabled:opacity-50"
          >
            {slots.length === 0 && <option value="__live__">DJ en vivo</option>}
            {slots.map((slot) => (
              <option key={slot.id ?? '__live__'} value={slot.id ?? '__live__'}>
                {slot.name} · {slot.mount}{slot.connected ? ' · conectado' : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={headphonesConfirmed}
            onChange={(event) => onHeadphonesConfirmed(event.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--brand-500)]"
          />
          Auriculares
        </label>

        <span className="hidden rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground sm:inline">
          Plan {maxDjs} DJ{maxDjs === 1 ? '' : 's'}
        </span>
        {mount && (
          <span className="hidden rounded-full bg-secondary px-2 py-1 font-mono text-[10px] text-muted-foreground md:inline">
            {mount}
          </span>
        )}
        <span className="hidden text-[10px] text-muted-foreground md:inline">
          {transport ? (transport === 'whip' ? 'WebRTC' : 'WebSocket') : '—'}
        </span>
        <span className="hidden text-[10px] text-muted-foreground md:inline">{bitrate} kbps</span>
        <span className="hidden text-[10px] text-muted-foreground lg:inline">
          RTT {stats.rttMs != null ? `${stats.rttMs} ms` : '—'}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => void onRefreshSlots()}
            disabled={busy || live}
            className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            title="Refrescar slots"
            aria-label="Refrescar slots"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
          </button>
          {live ? (
            <button
              type="button"
              onClick={() => void onStopLive()}
              className="rounded-lg bg-red-500/15 px-3 py-1.5 text-[11px] font-semibold text-red-300 transition-colors hover:bg-red-500/20"
            >
              Terminar transmisión
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void onGoLive()}
              disabled={!canGoLive}
              className="rounded-lg bg-brand px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Conectando…' : 'Salir al aire'}
            </button>
          )}
        </div>
      </div>

      {(slotOccupied || !headphonesConfirmed || streamBitrate < bitrate || error) && (
        <div className="mt-2 space-y-1 border-t border-border pt-2">
          {slotOccupied && (
            <p className="text-[10px] text-yellow-300/80">Ese slot ya está conectado. Elegí otro o desconectá al DJ actual.</p>
          )}
          {!headphonesConfirmed && (
            <p className="text-[10px] text-muted-foreground">Confirmá el uso de auriculares para habilitar la salida al aire.</p>
          )}
          {streamBitrate < bitrate && (
            <p className="text-[10px] text-yellow-200/80">
              La salida de la radio está en {streamBitrate} kbps; el objetivo es {bitrate} kbps.
            </p>
          )}
          {error && (
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-red-300">
              <span>{error}</span>
              {state === 'error' && (
                <button type="button" onClick={() => void onReconnect()} className="underline underline-offset-2 hover:text-red-200">
                  Reintentar
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
