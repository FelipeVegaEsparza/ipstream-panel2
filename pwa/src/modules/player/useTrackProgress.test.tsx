import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useTrackProgress,
  type TrackProgressData
} from './useTrackProgress'

let result: TrackProgressData | null = null

interface HarnessProps {
  duration: number | null | undefined
  trackKey: string | null | undefined
  isPlaying: boolean
  serverElapsed?: number | null
}

function Harness({ duration, trackKey, isPlaying, serverElapsed }: HarnessProps) {
  result = useTrackProgress(duration, trackKey, isPlaying, serverElapsed)
  return null
}

describe('useTrackProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    result = null
  })

  it('reinicia el avance cuando cambia la clave del tema', () => {
    const { rerender } = render(
      <Harness duration={100} trackKey="trk_1" isPlaying />
    )
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result?.current).toBeCloseTo(5)

    rerender(<Harness duration={100} trackKey="trk_2" isPlaying />)
    expect(result?.current).toBe(0)
  })

  it('avanza mientras está reproduciendo', () => {
    render(<Harness duration={100} trackKey="trk_1" isPlaying />)
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    expect(result?.current).toBeCloseTo(10)
    expect(result?.progress).toBeCloseTo(0.1)
  })

  it('no avanza cuando está en pausa', () => {
    render(<Harness duration={100} trackKey="trk_1" isPlaying={false} />)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result?.current).toBe(0)
  })

  it('reanuda sin sumar el tiempo en pausa', () => {
    const { rerender } = render(
      <Harness duration={100} trackKey="trk_1" isPlaying />
    )
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    expect(result?.current).toBeCloseTo(10)

    rerender(<Harness duration={100} trackKey="trk_1" isPlaying={false} />)
    act(() => {
      vi.advanceTimersByTime(30000)
    })

    rerender(<Harness duration={100} trackKey="trk_1" isPlaying />)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result?.current).toBeCloseTo(11)
  })

  it('devuelve duración null si no existe', () => {
    render(<Harness duration={null} trackKey="trk_1" isPlaying />)
    expect(result?.duration).toBeNull()
  })

  it('parte desde el elapsed que entrega la API', () => {
    render(
      <Harness
        duration={100}
        trackKey="trk_1"
        isPlaying={false}
        serverElapsed={40}
      />
    )
    expect(result?.current).toBe(40)
    expect(result?.progress).toBeCloseTo(0.4)
  })
})
