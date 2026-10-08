import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TenantProvider } from '@/core/config/TenantContext'
import { ApiError } from '@/core/api/errors'
import { getNewsBySlug, getPodcastById, getVideocastById } from '@/core/api'
import { NewsDetailPage } from './NewsDetailPage'
import { PodcastDetailPage } from './PodcastDetailPage'
import { VideocastDetailPage } from './VideocastDetailPage'

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
    getNewsBySlug: vi.fn(),
    getPodcastById: vi.fn(),
    getVideocastById: vi.fn()
  }
})

function renderAt(path: string, route: string, element: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={route} element={element} />
          </Routes>
        </MemoryRouter>
      </TenantProvider>
    </QueryClientProvider>
  )
}

afterEach(() => {
  baked.clientId = null
  vi.clearAllMocks()
})

describe('páginas de detalle: 404 vs error de conexión', () => {
  it('noticia 404 muestra "no encontrada" sin botón de reintento', async () => {
    baked.clientId = 'cmclient'
    vi.mocked(getNewsBySlug).mockRejectedValue(new ApiError(404))
    renderAt('/noticias/x', '/noticias/:slug', <NewsDetailPage />)

    expect(await screen.findByText('Noticia no encontrada')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull()
  })

  it('noticia con error de servidor muestra error recuperable', async () => {
    baked.clientId = 'cmclient'
    vi.mocked(getNewsBySlug).mockRejectedValue(new ApiError(500))
    renderAt('/noticias/x', '/noticias/:slug', <NewsDetailPage />)

    expect(await screen.findByText('No pudimos cargar la noticia')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('podcast con error de servidor muestra error recuperable', async () => {
    baked.clientId = 'cmclient'
    vi.mocked(getPodcastById).mockRejectedValue(new ApiError(500))
    renderAt('/podcasts/x', '/podcasts/:id', <PodcastDetailPage />)

    expect(
      await screen.findByText('No pudimos cargar el episodio')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('podcast 404 muestra "no encontrado"', async () => {
    baked.clientId = 'cmclient'
    vi.mocked(getPodcastById).mockRejectedValue(new ApiError(404))
    renderAt('/podcasts/x', '/podcasts/:id', <PodcastDetailPage />)

    expect(await screen.findByText('Episodio no encontrado')).toBeInTheDocument()
  })

  it('videocast con error de servidor muestra error recuperable', async () => {
    baked.clientId = 'cmclient'
    vi.mocked(getVideocastById).mockRejectedValue(new ApiError(500))
    renderAt('/videocasts/x', '/videocasts/:id', <VideocastDetailPage />)

    expect(
      await screen.findByText('No pudimos cargar el episodio')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('videocast 404 muestra "no encontrado"', async () => {
    baked.clientId = 'cmclient'
    vi.mocked(getVideocastById).mockRejectedValue(new ApiError(404))
    renderAt('/videocasts/x', '/videocasts/:id', <VideocastDetailPage />)

    expect(await screen.findByText('Episodio no encontrado')).toBeInTheDocument()
  })
})
