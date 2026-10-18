'use client'

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
  idle: { label: 'Listo para salir', className: 'bg-secondary text-muted-foreground' },
  preparing: { label: 'Preparando', className: 'bg-yellow-500/10 text-yellow-300' },
  connecting: { label: 'Conectando', className: 'bg-yellow-500/10 text-yellow-300' },
  live: { label: 'EN VIVO', className: 'bg-red-500/15 text-red-300' },
  reconnecting: { label: 'Reconectando', className: 'bg-yellow-500/10 text-yellow-300' },
  ended: { label: 'Fuera del aire', className: 'bg-secondary text-muted-foreground' },
  error: { label: 'Error', className: 'bg-red-500/15 text-red-300' },
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-xs text-foreground">{value}</div>
    </div>
  )
}

export function SessionPanel({
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
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>
              {state === 'live' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />}
              {status.label}
            </span>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] text-muted-foreground">
              Plan: hasta {maxDjs} DJ{maxDjs === 1 ? '' : 's'}
            </span>
            {mount && (
              <span className="rounded-full bg-secondary px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
                {mount}
              </span>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Slot</span>
              <select
                value={slotId ?? '__live__'}
                onChange={(event) => onSlotId(event.target.value === '__live__' ? null : event.target.value)}
                disabled={live || busy}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-brand disabled:opacity-50"
              >
                {slots.length === 0 && <option value="__live__">DJ en vivo</option>}
                {slots.map((slot) => (
                  <option key={slot.id ?? '__live__'} value={slot.id ?? '__live__'}>
                    {slot.name} · {slot.mount} · {slot.role}{slot.connected ? ' · conectado' : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-end gap-2 pb-2 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={headphonesConfirmed}
                onChange={(event) => onHeadphonesConfirmed(event.target.checked)}
                className="h-4 w-4 accent-[var(--brand-500)]"
              />
              Voy a monitorear con auriculares
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Transporte" value={transport ? (transport === 'whip' ? 'WebRTC' : 'WebSocket') : '—'} />
            <Stat label="Bitrate" value={`${bitrate} kbps`} />
            <Stat label="RTT" value={stats.rttMs != null ? `${stats.rttMs} ms` : '—'} />
            <Stat label="Pérdida" value={stats.packetLoss != null ? `${stats.packetLoss}%` : '—'} />
          </div>

          {streamBitrate < bitrate && (
            <p className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-[11px] text-yellow-200/80">
              La salida configurada de la radio está en {streamBitrate} kbps. Para aprovechar el
              objetivo de {bitrate} kbps, cambiala en Streaming → Configuración.
            </p>
          )}

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 lg:w-52">
          {!live ? (
            <button
              type="button"
              onClick={() => void onGoLive()}
              disabled={!canGoLive}
              className="rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Conectando…' : 'Salir al aire'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void onStopLive()}
              className="rounded-xl bg-red-500/15 px-4 py-3 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20"
            >
              Terminar transmisión
            </button>
          )}

          {state === 'error' && (
            <button
              type="button"
              onClick={() => void onReconnect()}
              className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-foreground hover:border-brand"
            >
              Reintentar
            </button>
          )}

          <button
            type="button"
            onClick={() => void onRefreshSlots()}
            disabled={busy || live}
            className="rounded-xl border border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            Refrescar slots
          </button>

          {slotOccupied && (
            <p className="text-[10px] leading-relaxed text-yellow-300/80">
              Ese slot ya está conectado. Elegí otro o desconectá al DJ actual.
            </p>
          )}
          {!headphonesConfirmed && (
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Confirmá el uso de auriculares para habilitar la salida al aire.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
