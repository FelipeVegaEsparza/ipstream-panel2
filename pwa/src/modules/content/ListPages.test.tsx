import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TenantProvider } from '@/core/config/TenantContext'
import { ApiError } from '@/core/api/errors'
import { getNews, getPodcasts, getVideocasts } from '@/core/api'
import { NewsListPage } from './NewsListPage'
import { PodcastsListPage } from './PodcastsListPage'
import { VideocastsListPage } from './VideocastsListPage'

const baked = vi.hoisted(() => ({ clientId: null as string | null }))

vi.mock('@/core/config/tenant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/tenant')>()
  return {
    ...actual,
    getBakedClientId: () => baked.clientId,
    getBakedClientName: () => null
  }
})

vi.mock('@/core/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api')>()
  return {
    ...actual,
    getNews: vi.fn(),
    getPodcasts: vi.fn(),
    getVideocasts: vi.fn()
  }
})

function page(data: unknown[], current: number) {
  return {
    data,
    pagination: { page: current, limit: 12, total: 15, pages: 2 },
    source: 'own' as const
  }
}

function news(id: string) {
  return {
    id,
    name: `Noticia ${id}`,
    slug: `noticia-${id}`,
    shortText: 'Resumen',
    longText: 'Texto',
    imageUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
}

function episode(id: string, title: string) {
  return {
    id,
    title,
    description: 'Descripción',
    imageUrl: null,
    duration: 30,
    episodeNumber: 1,
    season: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
}

function renderPage(element: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <MemoryRouter initialEntries={['/']}>{element}</MemoryRouter>
      </TenantProvider>
    </QueryClientProvider>
  )
}

afterEach(() => {
  baked.clientId = null
  vi.clearAllMocks()
})

describe('listados paginados: error de página', () => {
  it('noticias: al fallar la página 2 muestra error y no los datos de la página 1', async () => {
    baked.clientId = 'cmclient'
    vi.mocked(getNews).mockImplementation(async (_c, p) => {
      if (p === 1) return page([news('a1')], 1) as never
      throw new ApiError(500)
    })

    renderPage(<NewsListPage />)
    expect(await screen.findByText('Noticia a1')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(
      await screen.findByText('No se pudieron cargar las noticias', {}, { timeout: 4000 })
    ).toBeInTheDocument()
    expect(screen.queryByText('Noticia a1')).toBeNull()
  })

  it('noticias: al cargar bien la página 2 muestra los nuevos elementos', async () => {
    baked.clientId = 'cmclient'
    vi.mocked(getNews).mockImplementation(async (_c, p) => {
      return page([news(p === 1 ? 'a1' : 'b2')], p ?? 1) as never
    })

    renderPage(<NewsListPage />)
    expect(await screen.findByText('Noticia a1')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(await screen.findByText('Noticia b2')).toBeInTheDocument()
  })

  it('podcasts: al fallar la página 2 muestra error y no los datos de la página 1', async () => {
    baked.clientId = 'cmclient'
    vi.mocked(getPodcasts).mockImplementation(async (_c, p) => {
      if (p === 1) return page([episode('p1', 'Podcast uno')], 1) as never
      throw new ApiError(500)
    })

    renderPage(<PodcastsListPage />)
    expect(await screen.findByText('Podcast uno')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(
      await screen.findByText('No se pudieron cargar los podcasts', {}, { timeout: 4000 })
    ).toBeInTheDocument()
    expect(screen.queryByText('Podcast uno')).toBeNull()
  })

  it('videocasts: al fallar la página 2 muestra error y no los datos de la página 1', async () => {
    baked.clientId = 'cmclient'
    vi.mocked(getVideocasts).mockImplementation(async (_c, p) => {
      if (p === 1) {
        return page(
          [{ ...episode('v1', 'Videocast uno'), videoUrl: null }],
          1
        ) as never
      }
      throw new ApiError(500)
    })

    renderPage(<VideocastsListPage />)
    expect(await screen.findByText('Videocast uno')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(
      await screen.findByText('No se pudieron cargar los videocasts', {}, { timeout: 4000 })
    ).toBeInTheDocument()
    expect(screen.queryByText('Videocast uno')).toBeNull()
  })
})
