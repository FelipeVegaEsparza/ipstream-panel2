import { fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { TenantProvider } from '@/core/config/TenantContext'
import type { FullClientData, Podcast } from '@/core/types'
import { PodcastsSection } from './PodcastsSection'

function podcast(overrides: Partial<Podcast> = {}): Podcast {
  return {
    id: 'p1',
    title: 'Podcast uno',
    description: 'Descripción del episodio',
    imageUrl: null,
    audioUrl: 'https://cdn.example/audio.mp3',
    duration: 120,
    episodeNumber: 1,
    season: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

function renderSection(podcasts: Podcast[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <MemoryRouter>
          <PodcastsSection
            clientData={{ podcasts } as unknown as FullClientData}
            isLoading={false}
          />
        </MemoryRouter>
      </TenantProvider>
    </QueryClientProvider>
  )
}

describe('PodcastsSection modal', () => {
  it('abre el detalle en un modal con reproductor de audio', () => {
    const { container } = renderSection([podcast()])

    fireEvent.click(screen.getByRole('button', { name: 'Abrir podcast Podcast uno' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Descripción del episodio')).toBeInTheDocument()
    expect(container.querySelector('audio')).not.toBeNull()
  })

  it('abre el listado en un modal con "Ver todos"', () => {
    renderSection([podcast()])

    fireEvent.click(screen.getByRole('button', { name: 'Ver todos →' }))

    expect(within(screen.getByRole('dialog')).getByText('Podcasts')).toBeInTheDocument()
  })
})
