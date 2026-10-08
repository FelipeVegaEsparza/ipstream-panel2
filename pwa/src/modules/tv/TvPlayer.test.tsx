import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { HlsVideoHandle } from './useHlsVideo'
import { TvPlayer } from './TvPlayer'

const hlsState = vi.hoisted(() => ({
  current: null as unknown as HlsVideoHandle
}))

vi.mock('./useHlsVideo', () => ({
  useHlsVideo: () => hlsState.current
}))

function setState(state: Partial<HlsVideoHandle>) {
  hlsState.current = {
    status: 'loading',
    muted: false,
    needsInteraction: false,
    enableSound: vi.fn(),
    reload: vi.fn(),
    ...state
  }
}

describe('TvPlayer', () => {
  it('muestra "Activar sonido" cuando está silenciado', () => {
    setState({ status: 'playing', muted: true })
    render(<TvPlayer src="https://v/x.m3u8" />)
    expect(
      screen.getByRole('button', { name: 'Activar sonido' })
    ).toBeInTheDocument()
  })

  it('muestra "Reproducir" cuando el navegador bloqueó el autoplay', () => {
    setState({ muted: true, needsInteraction: true })
    render(<TvPlayer src="https://v/x.m3u8" />)
    expect(screen.getByRole('button', { name: 'Reproducir' })).toBeInTheDocument()
  })

  it('no muestra botón extra cuando reproduce con sonido', () => {
    setState({ status: 'playing' })
    render(<TvPlayer src="https://v/x.m3u8" />)
    expect(
      screen.queryByRole('button', { name: 'Activar sonido' })
    ).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reproducir' })).toBeNull()
  })

  it('muestra el error con la opción de reintentar', () => {
    setState({ status: 'error' })
    render(<TvPlayer src="https://v/x.m3u8" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
