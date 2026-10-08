import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TenantProvider } from '@/core/config/TenantContext'
import { PlayerProvider } from '@/modules/player/PlayerContext'
import type { FullClientData } from '@/core/types'
import { CoveredTemplate } from './CoveredTemplate'

const baked = vi.hoisted(() => ({ clientId: null as string | null }))

vi.mock('@/core/config/tenant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/tenant')>()
  return {
    ...actual,
    getBakedClientId: () => baked.clientId,
    getBakedClientName: () => null
  }
})

vi.mock('@/core/hooks/useStreaming', () => ({
  useStreaming: () => ({
    data: {
      clientId: 'cmtest',
      clientName: 'Radio Test',
      mount: null,
      streamUrl: '',
      bitrate: null,
      status: 'off',
      isLive: false,
      listeners: 0,
      listenerPeak: 0,
      jingleConfig: null,
      currentTrack: null,
      nextTrack: null,
      position: null,
      lastUpdate: ''
    },
    isLoading: false
  })
}))

function clientDataWith(basicData: Record<string, unknown>): FullClientData {
  return {
    client: { id: 'cmtest', name: 'Radio Test' },
    selectedTemplate: 'covered',
    oneSignalAppId: null,
    basicData: {
      projectName: 'Radio Test',
      projectDescription: 'La radio de la Patagonia',
      logoUrl: null,
      coverUrl: null,
      websiteUrl: null,
      radioStreamingUrl: null,
      videoStreamingUrl: null,
      location: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ...basicData
    },
    socialNetworks: null,
    programs: [],
    news: [],
    videos: [],
    sponsors: [],
    galleries: [],
    announcers: [],
    polls: [],
    events: [],
    promotions: [],
    podcasts: [],
    videocasts: []
  } as unknown as FullClientData
}

function renderCovered(clientData: FullClientData) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <PlayerProvider>
          <MemoryRouter>
            <CoveredTemplate clientData={clientData} isLoading={false} />
          </MemoryRouter>
        </PlayerProvider>
      </TenantProvider>
    </QueryClientProvider>
  )
}

function aboutSection(): HTMLElement | null {
  const description = screen.queryByText('La radio de la Patagonia')
  return description ? (description.closest('section') ?? null) : null
}

describe('CoveredTemplate bloque de identidad de la radio', () => {
  beforeEach(() => {
    baked.clientId = 'cmtest'
  })

  it('muestra cover, título y descripción antes del footer', () => {
    const { container } = renderCovered(
      clientDataWith({
        coverUrl: 'https://cdn.example/cover.png',
        logoUrl: 'https://cdn.example/logo.png'
      })
    )

    expect(
      screen.getByRole('heading', { level: 2, name: 'Radio Test' })
    ).toBeInTheDocument()
    expect(screen.getByText('La radio de la Patagonia')).toBeInTheDocument()

    const section = aboutSection()
    expect(section).not.toBeNull()
    expect(section!.querySelector('img')?.getAttribute('src')).toBe(
      'https://cdn.example/cover.png'
    )

    const footer = container.querySelector('footer')
    expect(footer).not.toBeNull()
    expect(
      section!.compareDocumentPosition(footer!)
    ).toBeGreaterThanOrEqual(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('usa el logo como fallback cuando no hay cover', () => {
    renderCovered(
      clientDataWith({
        coverUrl: null,
        logoUrl: 'https://cdn.example/logo.png'
      })
    )

    const section = aboutSection()
    expect(section).not.toBeNull()
    expect(section!.querySelector('img')?.getAttribute('src')).toBe(
      'https://cdn.example/logo.png'
    )
  })

  it('degrada a solo texto cuando no hay cover ni logo', () => {
    renderCovered(clientDataWith({ coverUrl: null, logoUrl: null }))

    expect(
      screen.getByRole('heading', { level: 2, name: 'Radio Test' })
    ).toBeInTheDocument()
    expect(screen.getByText('La radio de la Patagonia')).toBeInTheDocument()

    const section = aboutSection()
    expect(section).not.toBeNull()
    expect(section!.querySelector('img')).toBeNull()
  })
})
