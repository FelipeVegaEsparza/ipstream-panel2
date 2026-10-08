import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { TenantProvider } from '@/core/config/TenantContext'
import { PlayerProvider } from '@/modules/player/PlayerContext'
import { ContentSectionStack } from '@/modules/content/ContentSections'
import type { FullClientData } from '@/core/types'
import { Moderno2Template } from './Moderno2Template'

const baked = vi.hoisted(() => ({ clientId: null as string | null }))

vi.mock('@/core/config/tenant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/tenant')>()
  return {
    ...actual,
    getBakedClientId: () => baked.clientId,
    getBakedClientName: () => null
  }
})

const streaming = vi.hoisted(() => ({ current: null as unknown }))

vi.mock('@/core/hooks/useStreaming', () => ({
  useStreaming: () => ({ data: streaming.current, isLoading: false })
}))

function clientData(overrides: Record<string, unknown> = {}): FullClientData {
  const base = {
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
  return {
    client: { id: 'cmtest', name: 'Radio Test' },
    selectedTemplate: 'moderno2',
    oneSignalAppId: null,
    basicData: {
      projectName: 'Radio Test',
      projectDescription: 'La radio',
      logoUrl: null,
      coverUrl: null,
      websiteUrl: null,
      radioStreamingUrl: 'https://stream.example/radio.mp3',
      videoStreamingUrl: 'https://stream.example/tv.m3u8',
      location: null,
      ...base
    },
    socialNetworks: null,
    programs: [
      {
        id: 'pg1',
        name: 'Programa 1',
        imageUrl: null,
        description: '',
        startTime: '08:00',
        endTime: '10:00',
        weekDays: [1],
        ...base
      }
    ],
    news: [
      {
        id: 'n1',
        name: 'Noticia 1',
        slug: 'noticia-1',
        shortText: '',
        longText: '',
        imageUrl: null,
        ...base
      }
    ],
    videos: [],
    sponsors: [],
    galleries: [],
    announcers: [],
    polls: [],
    events: [],
    promotions: [],
    podcasts: [],
    videocasts: [],
    gcBar: [{ id: 'gc1', text: 'Mensaje GC', order: 0, ...base }],
    ...overrides
  } as unknown as FullClientData
}

function renderTemplate(data: FullClientData) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <PlayerProvider>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route
                element={<Moderno2Template clientData={data} isLoading={false} />}
              >
                <Route
                  index
                  element={
                    <ContentSectionStack clientData={data} isLoading={false} />
                  }
                />
              </Route>
            </Routes>
          </MemoryRouter>
        </PlayerProvider>
      </TenantProvider>
    </QueryClientProvider>
  )
}

describe('Moderno2Template', () => {
  beforeEach(() => {
    baked.clientId = 'cmtest'
    streaming.current = null
    localStorage.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ current_weather: { temperature: 15, weathercode: 0 } }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        )
      )
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('muestra el tema actual y el artista en el hero', () => {
    streaming.current = {
      status: 'live',
      isLive: true,
      listeners: 5,
      bitrate: 128,
      currentTrack: { title: 'Tema X', artist: 'Artista Y', coverUrl: null, duration: 200 },
      nextTrack: null
    }

    renderTemplate(clientData())

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tema X')
    expect(screen.getAllByText('Artista Y').length).toBeGreaterThan(0)
    expect(screen.getAllByText('EN VIVO').length).toBeGreaterThan(0)
  })

  it('cae al nombre de la radio cuando no hay tema', () => {
    renderTemplate(clientData())
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'La radio suena en vivo'
    )
  })

  it('navega a las secciones disponibles con anclas', () => {
    renderTemplate(clientData())

    const inicio = screen.getByRole('link', { name: 'Inicio' })
    expect(inicio).toHaveAttribute('href', '#section-inicio')
    expect(inicio.closest('header')).not.toBeNull()
    expect(screen.getByRole('link', { name: 'Noticias' })).toHaveAttribute(
      'href',
      '#seccion-news'
    )
    expect(screen.getByRole('link', { name: 'Programación' })).toHaveAttribute(
      'href',
      '#seccion-programs'
    )
    expect(screen.getByLabelText('Abrir menú de secciones')).toBeInTheDocument()
  })

  it('habilita el play sólo si hay streamUrl', () => {
    const data = clientData()
    if (data.basicData) {
      data.basicData.radioStreamingUrl = null
      data.basicData.videoStreamingUrl = null
    }
    const { unmount } = renderTemplate(data)
    expect(screen.getByRole('button', { name: 'REPRODUCIR' })).toBeDisabled()
    unmount()

    renderTemplate(clientData())
    expect(screen.getByRole('button', { name: 'REPRODUCIR' })).toBeEnabled()
  })

  it('en modo solo TV muestra el video y oculta la radio', () => {
    const data = clientData()
    if (data.basicData) data.basicData.radioStreamingUrl = null

    const { container } = renderTemplate(data)

    expect(screen.queryByRole('button', { name: 'REPRODUCIR' })).toBeNull()
    expect(container.querySelector('video')).not.toBeNull()
  })

  it('integra la vista de clima multi-ciudad', async () => {
    renderTemplate(clientData())
    expect(
      await screen.findByRole('heading', { name: 'Clima en Chile' })
    ).toBeInTheDocument()
    expect(screen.getByText('Valparaíso')).toBeInTheDocument()
    expect(screen.getByText('Iquique')).toBeInTheDocument()
  })

  it('integra el historial de canciones', () => {
    streaming.current = {
      status: 'live',
      isLive: true,
      listeners: 0,
      bitrate: null,
      currentTrack: {
        title: 'Tema Historial',
        artist: 'Artista',
        album: null,
        coverUrl: null,
        duration: 100,
        isJingle: false
      },
      nextTrack: null
    }

    renderTemplate(clientData())

    expect(
      screen.getByRole('heading', { name: 'Canciones sonadas' })
    ).toBeInTheDocument()
    expect(screen.getAllByText('Tema Historial').length).toBeGreaterThan(0)

    const news = screen.getByRole('heading', { name: 'Noticias' })
    const history = screen.getByRole('heading', { name: 'Canciones sonadas' })
    expect(news.compareDocumentPosition(history)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
  })

  it('muestra el bloque de contacto con formulario, redes e instalar app', () => {
    const data = clientData()
    data.socialNetworks = {
      facebook: 'https://facebook.com/radio',
      youtube: null,
      instagram: null,
      tiktok: null,
      whatsapp: null,
      x: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    }

    renderTemplate(data)

    expect(
      screen.getByRole('heading', { name: 'Contáctanos' })
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Formulario de contacto')).toBeInTheDocument()
    expect(screen.getByText('Síguenos')).toBeInTheDocument()
    expect(screen.getByText('Instala la app')).toBeInTheDocument()
  })
})
