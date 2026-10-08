import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FullClientData } from '@/core/types'
import { TvSection } from './TvSection'

vi.mock('@/modules/tv/useHlsVideo', () => ({
  useHlsVideo: () => ({ status: 'loading', reload: vi.fn() })
}))

function data(videoStreamingUrl: string | null): FullClientData {
  return { basicData: { videoStreamingUrl } } as unknown as FullClientData
}

describe('TvSection', () => {
  it('muestra el video cuando hay videoStreamingUrl', () => {
    const { container } = render(
      <TvSection clientData={data('https://v/x.m3u8')} isLoading={false} />
    )
    expect(container.querySelector('video')).not.toBeNull()
    expect(screen.getByText('TV en vivo')).toBeInTheDocument()
  })

  it('no se renderiza sin videoStreamingUrl', () => {
    const { container } = render(
      <TvSection clientData={data(null)} isLoading={false} />
    )
    expect(container.querySelector('section')).toBeNull()
  })
})
