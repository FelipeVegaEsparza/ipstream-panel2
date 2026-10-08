import { fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { TenantProvider } from '@/core/config/TenantContext'
import type { FullClientData, Videocast } from '@/core/types'
import { VideocastsSection } from './VideocastsSection'

function videocast(overrides: Partial<Videocast> = {}): Videocast {
  return {
    id: 'v1',
    title: 'Videocast uno',
    description: 'Descripción del videocast',
    imageUrl: null,
    videoUrl: null,
    duration: 300,
    episodeNumber: 1,
    season: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

function renderSection(videocasts: Videocast[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <MemoryRouter>
          <VideocastsSection
            clientData={{ videocasts } as unknown as FullClientData}
            isLoading={false}
          />
        </MemoryRouter>
      </TenantProvider>
    </QueryClientProvider>
  )
}

describe('VideocastsSection modal', () => {
  it('abre el detalle en un modal', () => {
    renderSection([videocast()])

    fireEvent.click(screen.getByRole('button', { name: 'Abrir videocast Videocast uno' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Descripción del videocast')).toBeInTheDocument()
  })

  it('abre el listado en un modal con "Ver todos"', () => {
    renderSection([videocast()])

    fireEvent.click(screen.getByRole('button', { name: 'Ver todos →' }))

    expect(within(screen.getByRole('dialog')).getByText('Videocasts')).toBeInTheDocument()
  })
})
