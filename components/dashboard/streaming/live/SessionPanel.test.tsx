import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SessionPanel } from './SessionPanel'
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

function renderPanel(overrides: {
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
    <SessionPanel
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
    />,
  )
  return handlers
}

describe('SessionPanel', () => {
  it('bloquea salir al aire sin confirmar auriculares', () => {
    renderPanel()
    expect(screen.getByText(/Confirmá el uso de auriculares/)).toBeInTheDocument()
    expect(screen.getByText('Salir al aire')).toBeDisabled()
  })

  it('permite salir al aire con auriculares confirmados', () => {
    const handlers = renderPanel({ headphones: true })
    const button = screen.getByText('Salir al aire')
    expect(button).toBeEnabled()
    fireEvent.click(button)
    expect(handlers.onGoLive).toHaveBeenCalledOnce()
  })

  it('bloquea un slot ya conectado', () => {
    renderPanel({ headphones: true, slots: [{ ...slot, connected: true, onAir: true }] })
    expect(screen.getByText(/Ese slot ya está conectado/)).toBeInTheDocument()
    expect(screen.getByText('Salir al aire')).toBeDisabled()
  })

  it('muestra terminar transmisión cuando está en vivo', () => {
    const handlers = renderPanel({ state: 'live', headphones: true })
    const button = screen.getByText('Terminar transmisión')
    fireEvent.click(button)
    expect(handlers.onStopLive).toHaveBeenCalledOnce()
  })

  it('muestra el error y permite reintentar', () => {
    const handlers = renderPanel({ state: 'error', headphones: true, error: 'Falló la conexión' })
    expect(screen.getByText('Falló la conexión')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Reintentar'))
    expect(handlers.onReconnect).toHaveBeenCalledOnce()
  })

  it('muestra transporte, bitrate y métricas', () => {
    renderPanel({ state: 'live', headphones: true })
    expect(screen.getByText('WebRTC')).toBeInTheDocument()
    expect(screen.getByText('192 kbps')).toBeInTheDocument()
    expect(screen.getByText('40 ms')).toBeInTheDocument()
  })
})
