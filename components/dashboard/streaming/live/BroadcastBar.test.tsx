import { DashboardI18nProvider } from '@/components/providers/DashboardI18nProvider'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { BroadcastBar } from './BroadcastBar'
import type { SessionState, SlotOption, TransportStats } from '@/lib/live-console/types'

const stats: TransportStats = {
  bitrateKbps: 192,
  rttMs: 40,
  packetLoss: 0,
  jitterMs: 8,
  state: 'live',
  error: null,
}

const slot: SlotOption = {
  id: 'dj1',
  name: 'DJ Uno',
  mount: '/dj1',
  role: 'host',
  priority: 1,
  connected: false,
  onAir: false,
}

function renderBar(overrides: {
  state?: SessionState
  slotId?: string | null
  slots?: SlotOption[]
  headphones?: boolean
  error?: string | null
} = {}) {
  const handlers = {
    onSlotId: vi.fn(),
    onHeadphonesConfirmed: vi.fn(),
    onGoLive: vi.fn().mockResolvedValue(undefined),
    onStopLive: vi.fn().mockResolvedValue(undefined),
    onReconnect: vi.fn().mockResolvedValue(undefined),
    onRefreshSlots: vi.fn().mockResolvedValue(undefined),
  }
  render(
    <DashboardI18nProvider locale="es">
    <BroadcastBar
      engineReady
      state={overrides.state ?? 'idle'}
      transport="whip"
      stats={stats}
      error={overrides.error ?? null}
      slots={overrides.slots ?? [slot]}
      maxDjs={4}
      slotId={overrides.slotId ?? 'dj1'}
      onSlotId={handlers.onSlotId}
      mount="/dj1"
      bitrate={192}
      streamBitrate={192}
      headphonesConfirmed={overrides.headphones ?? false}
      onHeadphonesConfirmed={handlers.onHeadphonesConfirmed}
      onGoLive={handlers.onGoLive}
      onStopLive={handlers.onStopLive}
      onReconnect={handlers.onReconnect}
      onRefreshSlots={handlers.onRefreshSlots}
    />
    </DashboardI18nProvider>
  )
  return handlers
}

describe('BroadcastBar', () => {
  it('bloquea salir al aire sin auriculares', () => {
    renderBar()
    expect(screen.getByText(/Confirmá el uso de auriculares/)).toBeInTheDocument()
    expect(screen.getByText('Salir al aire')).toBeDisabled()
  })

  it('permite salir al aire con auriculares', () => {
    const handlers = renderBar({ headphones: true })
    fireEvent.click(screen.getByText('Salir al aire'))
    expect(handlers.onGoLive).toHaveBeenCalledOnce()
  })

  it('bloquea un slot ocupado', () => {
    renderBar({ headphones: true, slots: [{ ...slot, connected: true, onAir: true }] })
    expect(screen.getByText(/Ese slot ya está conectado/)).toBeInTheDocument()
    expect(screen.getByText('Salir al aire')).toBeDisabled()
  })

  it('muestra terminar cuando está en vivo', () => {
    const handlers = renderBar({ state: 'live', headphones: true })
    fireEvent.click(screen.getByText('Terminar transmisión'))
    expect(handlers.onStopLive).toHaveBeenCalledOnce()
  })

  it('muestra el error y permite reintentar', () => {
    const handlers = renderBar({ state: 'error', headphones: true, error: 'Falló la conexión' })
    fireEvent.click(screen.getByText('Reintentar'))
    expect(handlers.onReconnect).toHaveBeenCalledOnce()
  })
})
