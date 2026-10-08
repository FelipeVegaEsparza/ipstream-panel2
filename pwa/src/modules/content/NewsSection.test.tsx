import { fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TenantProvider } from '@/core/config/TenantContext'
import type { FullClientData, News } from '@/core/types'
import { NewsSection } from './NewsSection'

const baked = vi.hoisted(() => ({ clientId: null as string | null }))

vi.mock('@/core/config/tenant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/tenant')>()
  return {
    ...actual,
    getBakedClientId: () => baked.clientId,
    getBakedClientName: () => null
  }
})

function newsItem(id: string, name: string, overrides: Partial<News> = {}): News {
  return {
    id,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    shortText: 'Resumen breve',
    longText: 'Contenido completo de la noticia',
    imageUrl: null,
    category: { id: 'c1', name: 'Actualidad', slug: 'actualidad' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

function clientDataWith(news: News[]): FullClientData {
  return { news } as unknown as FullClientData
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

function renderNews(variant: 'grid' | 'featured', news: News[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <MemoryRouter>
          <NewsSection clientData={clientDataWith(news)} isLoading={false} variant={variant} />
        </MemoryRouter>
      </TenantProvider>
    </QueryClientProvider>
  )
}

describe('NewsSection variant featured', () => {
  const news = [
    newsItem('n1', 'Primera noticia'),
    newsItem('n2', 'Segunda noticia'),
    newsItem('n3', 'Tercera noticia'),
    newsItem('n4', 'Cuarta noticia'),
    newsItem('n5', 'Quinta noticia')
  ]

  it('no se renderiza sin noticias', () => {
    const { container } = renderNews('featured', [])
    expect(container.firstChild).toBeNull()
  })

  it('muestra la primera como destacada y hasta 3 en el costado', () => {
    const { container } = renderNews('featured', news)

    const layout = container.querySelector('[class*="layout"]')
    expect(layout).not.toBeNull()

    const featured = container.querySelector('[class*="featured"]')
    expect(featured).not.toBeNull()
    expect(within(featured as HTMLElement).getByText('Primera noticia')).toBeInTheDocument()

    expect(screen.getByText('Segunda noticia')).toBeInTheDocument()
    expect(screen.getByText('Tercera noticia')).toBeInTheDocument()
    expect(screen.getByText('Cuarta noticia')).toBeInTheDocument()
    expect(screen.queryByText('Quinta noticia')).toBeNull()
  })

  it('con pocas noticias muestra solo las disponibles', () => {
    renderNews('featured', [newsItem('n1', 'Única noticia')])
    expect(screen.getByText('Única noticia')).toBeInTheDocument()
  })
})

describe('NewsSection modal', () => {
  afterEach(() => {
    baked.clientId = null
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('abre el detalle en un modal al pinchar una noticia en la variante grid', () => {
    renderNews('grid', [newsItem('n1', 'Noticia modal')])

    fireEvent.click(screen.getByRole('button', { name: 'Abrir noticia Noticia modal' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Noticia modal')).toBeInTheDocument()
    expect(
      within(dialog).getByText('Contenido completo de la noticia')
    ).toBeInTheDocument()
    expect(
      within(dialog).queryByRole('link', { name: 'Ver noticia completa →' })
    ).toBeNull()
  })

  it('abre el listado en un modal con "Ver todas"', () => {
    renderNews('grid', [newsItem('n1', 'Noticia uno')])

    fireEvent.click(screen.getByRole('button', { name: 'Ver todas →' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Noticias')).toBeInTheDocument()
  })

  it('carga y muestra el texto completo desde el API por slug', async () => {
    baked.clientId = 'cmclient'
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/news/noticia-api')) {
          return Promise.resolve(
            jsonResponse(200, {
              id: 'n1',
              name: 'Noticia API',
              slug: 'noticia-api',
              shortText: 'Resumen',
              longText: 'Texto largo que viene completo desde el API por slug.',
              imageUrl: null,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z'
            })
          )
        }
        return Promise.resolve(jsonResponse(404, { error: 'not found' }))
      })
    )

    renderNews('grid', [newsItem('n1', 'Noticia API')])

    fireEvent.click(screen.getByRole('button', { name: 'Abrir noticia Noticia API' }))

    const dialog = screen.getByRole('dialog')
    expect(
      await within(dialog).findByText(
        'Texto largo que viene completo desde el API por slug.'
      )
    ).toBeInTheDocument()
  })

  it('abre el modal de compartir con la URL de la noticia', () => {
    renderNews('grid', [newsItem('n1', 'Noticia compartible')])

    fireEvent.click(screen.getByRole('button', { name: 'Abrir noticia Noticia compartible' }))

    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Compartir' }))

    const shareDialog = within(dialog).getByRole('dialog')
    expect(shareDialog).toBeInTheDocument()
    const whatsapp = within(shareDialog).getByRole('link', { name: 'WhatsApp' })
    expect(decodeURIComponent(whatsapp.getAttribute('href') ?? '')).toContain(
      '/noticias/noticia-compartible'
    )
  })

  it('abre una noticia lateral en la variante featured', () => {
    renderNews('featured', [
      newsItem('n1', 'Principal'),
      newsItem('n2', 'Lateral abierta')
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Abrir noticia Lateral abierta' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
