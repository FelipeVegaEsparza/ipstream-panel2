import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TenantProvider } from '@/core/config/TenantContext'
import type { FullClientData } from '@/core/types'
import { ContentSectionStack } from './ContentSections'
import contentStyles from './content.module.css'
import contactSocialStyles from './ContactSocialSection.module.css'
import newsStyles from './NewsSection.module.css'

function fullData(selectedTemplate: string): FullClientData {
  const base = {
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
  return {
    client: { id: 'cmtest', name: 'Radio Test' },
    selectedTemplate,
    oneSignalAppId: null,
    basicData: {
      projectName: 'Radio Test',
      projectDescription: 'La radio',
      logoUrl: null,
      coverUrl: null,
      websiteUrl: null,
      radioStreamingUrl: 'https://stream.example/radio.mp3',
      videoStreamingUrl: 'https://stream.example/tv.m3u8',
      ...base
    },
    socialNetworks: {
      facebook: 'https://facebook.com/radio',
      youtube: null,
      instagram: null,
      tiktok: null,
      whatsapp: null,
      x: null,
      ...base
    },
    news: [
      {
        id: 'n1',
        name: 'Noticia 1',
        slug: 'noticia-1',
        shortText: '',
        longText: '',
        imageUrl: null,
        createdAt: base.createdAt,
        updatedAt: base.updatedAt
      }
    ],
    podcasts: [
      {
        id: 'p1',
        title: 'Podcast 1',
        description: '',
        imageUrl: null,
        audioUrl: null,
        duration: null,
        episodeNumber: null,
        season: null,
        createdAt: base.createdAt,
        updatedAt: base.updatedAt
      }
    ],
    videocasts: [
      {
        id: 'v1',
        title: 'Videocast 1',
        description: '',
        imageUrl: null,
        videoUrl: null,
        duration: null,
        episodeNumber: null,
        season: null,
        createdAt: base.createdAt,
        updatedAt: base.updatedAt
      }
    ],
    galleries: [
      {
        id: 'g1',
        title: 'Galería 1',
        description: '',
        images: [],
        createdAt: base.createdAt,
        updatedAt: base.updatedAt
      }
    ],
    events: [
      {
        id: 'e1',
        title: 'Evento 1',
        description: '',
        date: '2026-02-01',
        time: '20:00',
        location: null,
        eventUrl: null,
        imageUrl: null,
        createdAt: base.createdAt,
        updatedAt: base.updatedAt
      }
    ],
    announcers: [
      {
        id: 'a1',
        name: 'Locutor 1',
        description: '',
        imageUrl: null,
        createdAt: base.createdAt,
        updatedAt: base.updatedAt
      }
    ],
    polls: [
      {
        id: 'po1',
        title: 'Encuesta 1',
        active: true,
        options: [{ id: 'o1', text: 'Opción', votes: 0 }],
        createdAt: base.createdAt,
        updatedAt: base.updatedAt
      }
    ],
    promotions: [
      {
        id: 'pr1',
        title: 'Promoción 1',
        description: '',
        imageUrl: null,
        link: null,
        createdAt: base.createdAt,
        updatedAt: base.updatedAt
      }
    ],
    programs: [
      {
        id: 'pg1',
        name: 'Programa 1',
        imageUrl: null,
        description: '',
        startTime: '08:00',
        endTime: '10:00',
        weekDays: [1],
        createdAt: base.createdAt,
        updatedAt: base.updatedAt
      }
    ],
    videos: [
      {
        id: 'vd1',
        name: 'Video 1',
        videoUrl: 'https://stream.example/video.mp4',
        description: '',
        order: 0,
        createdAt: base.createdAt,
        updatedAt: base.updatedAt
      }
    ],
    sponsors: [
      {
        id: 's1',
        name: 'Auspiciador 1',
        logoUrl: null,
        address: null,
        description: '',
        facebook: null,
        youtube: null,
        instagram: null,
        tiktok: null,
        whatsapp: null,
        x: null,
        website: null,
        createdAt: base.createdAt,
        updatedAt: base.updatedAt
      }
    ]
  }
}

function sectionTitles(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('section h2')).map(
    (heading) => heading.textContent ?? ''
  )
}

function renderStack(template: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <MemoryRouter>
          <ContentSectionStack
            clientData={fullData(template)}
            isLoading={false}
          />
        </MemoryRouter>
      </TenantProvider>
    </QueryClientProvider>
  )
}

const DEFAULT_ORDER = [
  'Encuestas',
  'TV en vivo',
  'Promociones',
  'Noticias',
  'Programación',
  'Galerías',
  'Podcasts',
  'Videocasts',
  'Videos',
  'Eventos',
  'Locutores',
  'Auspiciadores',
  'Síguenos',
  'Contáctanos'
]

const COVERED_ORDER = [
  'Noticias',
  'Podcasts',
  'Videocasts',
  'Galerías',
  'Eventos',
  'Locutores',
  'Encuestas',
  'TV en vivo',
  'Promociones',
  'Programación',
  'Videos',
  'Auspiciadores',
  'Contáctanos',
  'Síguenos'
]

// El clima multi-ciudad y el historial de moderno2 se componen en el template,
// no en el stack data-driven.
const MODERNO2_ORDER = [
  'Noticias',
  'Programación',
  'TV en vivo',
  'Videos',
  'Locutores',
  'Auspiciadores',
  'Promociones',
  'Podcasts',
  'Videocasts',
  'Galerías',
  'Eventos',
  'Encuestas'
]

describe('ContentSectionStack', () => {
  it('antepone el orden editorial en la home de covered', () => {
    const { container } = renderStack('covered')
    expect(sectionTitles(container)).toEqual(COVERED_ORDER)
  })

  it('usa el orden propio de moderno2 y no muestra contacto', () => {
    const { container } = renderStack('moderno2')
    const titles = sectionTitles(container)
    expect(titles).toEqual(MODERNO2_ORDER)
    expect(titles).not.toContain('Contáctanos')
  })

  it('omite secciones sin datos en moderno2 sin alterar el orden', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const data = fullData('moderno2')
    data.news = []
    data.videos = []
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          <MemoryRouter>
            <ContentSectionStack clientData={data} isLoading={false} />
          </MemoryRouter>
        </TenantProvider>
      </QueryClientProvider>
    )
    const titles = sectionTitles(container)
    expect(titles).not.toContain('Noticias')
    expect(titles).not.toContain('Videos')
    expect(titles.indexOf('Programación')).toBeLessThan(titles.indexOf('TV en vivo'))
    expect(titles.indexOf('Locutores')).toBeLessThan(titles.indexOf('Auspiciadores'))
  })

  it('en moderno2 los titulares llevan la palabra gigante de fondo', () => {
    const { container } = renderStack('moderno2')
    const headings = Array.from(container.querySelectorAll('section h2'))
    expect(headings.length).toBeGreaterThan(0)
    expect(
      headings.every((heading) => heading.getAttribute('data-bg-text'))
    ).toBe(true)
  })

  it('otros templates no emiten data-bg-text', () => {
    const { container } = renderStack('moderna')
    const headings = Array.from(container.querySelectorAll('section h2'))
    expect(
      headings.some((heading) => heading.getAttribute('data-bg-text'))
    ).toBe(false)
  })

  it('en moderno2 muestra una noticia principal y hasta tres secundarias', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const data = fullData('moderno2')
    data.news = [1, 2, 3, 4].map((n) => ({
      id: `n${n}`,
      name: `Noticia ${n}`,
      slug: `noticia-${n}`,
      shortText: '',
      longText: '',
      imageUrl: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    }))

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          <MemoryRouter>
            <ContentSectionStack clientData={data} isLoading={false} />
          </MemoryRouter>
        </TenantProvider>
      </QueryClientProvider>
    )

    expect(container.querySelector(`.${newsStyles.layout}`)).not.toBeNull()
    expect(container.querySelectorAll(`.${newsStyles.sideCard}`)).toHaveLength(3)
  })

  it('en moderno2 la programación usa tabs por día', () => {
    const { container } = renderStack('moderno2')
    expect(container.querySelectorAll('[role="tab"]')).toHaveLength(7)
  })

  it('en modo solo TV omite la sección de TV del stack', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const data = fullData('moderna')
    if (data.basicData) {
      data.basicData.radioStreamingUrl = null
      data.basicData.videoStreamingUrl = 'https://stream.example/tv.m3u8'
    }
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          <MemoryRouter>
            <ContentSectionStack clientData={data} isLoading={false} />
          </MemoryRouter>
        </TenantProvider>
      </QueryClientProvider>
    )
    expect(sectionTitles(container)).not.toContain('TV en vivo')
  })

  it('combina contacto y síguenos en una sección de dos columnas en covered', () => {
    const { container } = renderStack('covered')
    const grid = container.querySelector(`.${contactSocialStyles.grid}`)

    expect(grid).not.toBeNull()
    expect(
      Array.from(grid!.querySelectorAll('h2')).map((heading) => heading.textContent)
    ).toEqual(['Contáctanos', 'Síguenos'])
    expect(grid!.querySelector('form')).not.toBeNull()
    expect(grid!.querySelector('img[src="/app-android.png"]')).not.toBeNull()
    expect(grid!.querySelector('img[src="/app-apple.png"]')).not.toBeNull()
    expect(
      grid!.querySelector('a[aria-label="Facebook"]')?.getAttribute('style')
    ).toContain('background')
    expect(screen.queryByText('Escríbenos por WhatsApp')).toBeNull()
    expect(screen.queryByText(/Visita nuestro sitio/)).toBeNull()
  })

  it('muestra WhatsApp, sitio web y compartir cuando están configurados', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const data = fullData('covered')
    if (data.basicData) data.basicData.websiteUrl = 'https://radio.cl'
    if (data.socialNetworks) data.socialNetworks.whatsapp = 'https://wa.me/56912345678'

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          <MemoryRouter>
            <ContentSectionStack clientData={data} isLoading={false} />
          </MemoryRouter>
        </TenantProvider>
      </QueryClientProvider>
    )

    const grid = container.querySelector(`.${contactSocialStyles.grid}`)
    expect(grid).not.toBeNull()
    expect(
      grid!.querySelector('a[href="https://wa.me/56912345678"]')
    ).not.toBeNull()
    expect(grid!.querySelector('a[href="https://radio.cl"]')).not.toBeNull()
    expect(
      grid!.querySelector('button[aria-label="Compartir"]')
    ).not.toBeNull()
    expect(
      screen.getByText('Síguenos y llévate la radio contigo.')
    ).toBeInTheDocument()
  })

  it('no usa la sección combinada en otros templates', () => {
    const { container } = renderStack('moderna')
    expect(container.querySelector(`.${contactSocialStyles.grid}`)).toBeNull()
  })

  it('combina contacto y síguenos en blue con los botones de instalar', () => {
    const { container } = renderStack('blue')
    const grid = container.querySelector(`.${contactSocialStyles.grid}`)

    expect(grid).not.toBeNull()
    expect(
      Array.from(grid!.querySelectorAll('h2')).map((heading) => heading.textContent)
    ).toEqual(['Contáctanos', 'Síguenos'])
    expect(grid!.querySelector('img[src="/app-android.png"]')).not.toBeNull()
  })

  it('conserva el orden actual para un template distinto de covered', () => {
    const { container } = renderStack('moderna')
    expect(sectionTitles(container)).toEqual(DEFAULT_ORDER)
  })

  it('no renderiza una sección sin datos ni altera el orden del resto', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const data = fullData('covered')
    data.news = []
    data.events = []
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          <MemoryRouter>
            <ContentSectionStack clientData={data} isLoading={false} />
          </MemoryRouter>
        </TenantProvider>
      </QueryClientProvider>
    )
    const titles = sectionTitles(container)
    expect(titles).not.toContain('Noticias')
    expect(titles).not.toContain('Eventos')
    expect(titles.indexOf('Podcasts')).toBeLessThan(titles.indexOf('Galerías'))
    expect(titles.indexOf('Galerías')).toBeLessThan(titles.indexOf('Locutores'))
  })

  it('no muestra la sección de contacto para el template minimalista', () => {
    const { container } = renderStack('minimalista')
    expect(sectionTitles(container)).not.toContain('Contáctanos')
  })

  it('muestra la sección de pronóstico con la ciudad cuando hay ubicación', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            daily: {
              time: ['2026-01-01', '2026-01-02'],
              weather_code: [0, 3],
              temperature_2m_max: [20, 18],
              temperature_2m_min: [10, 9]
            }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    )

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const data = fullData('moderna')
    if (data.basicData) {
      data.basicData.location = {
        city: 'Santiago',
        country: 'CL',
        latitude: -33.45,
        longitude: -70.66
      }
    }

    render(
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          <MemoryRouter>
            <ContentSectionStack clientData={data} isLoading={false} />
          </MemoryRouter>
        </TenantProvider>
      </QueryClientProvider>
    )

    expect(
      await screen.findByText('Proyección del clima en Santiago')
    ).toBeInTheDocument()
  })

  it('en blue, la sección de clima incluye la tarjeta del clima actual', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              current_weather: { temperature: 21.4, weathercode: 0 },
              daily: {
                time: ['2026-01-01'],
                weather_code: [0],
                temperature_2m_max: [24],
                temperature_2m_min: [12]
              }
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        )
      )
    )

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const data = fullData('blue')
    if (data.basicData) {
      data.basicData.location = {
        city: 'Valparaíso',
        country: 'CL',
        latitude: -33.05,
        longitude: -71.6
      }
    }

    render(
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          <MemoryRouter>
            <ContentSectionStack clientData={data} isLoading={false} />
          </MemoryRouter>
        </TenantProvider>
      </QueryClientProvider>
    )

    expect(
      await screen.findByText('Proyección del clima en Valparaíso')
    ).toBeInTheDocument()
    expect(await screen.findByText('21°C')).toBeInTheDocument()
  })

  it('no muestra la sección de pronóstico si hay coordenadas pero no ciudad', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const data = fullData('moderna')
    if (data.basicData) {
      data.basicData.location = {
        city: null,
        country: 'CL',
        latitude: -33.45,
        longitude: -70.66
      }
    }

    render(
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          <MemoryRouter>
            <ContentSectionStack clientData={data} isLoading={false} />
          </MemoryRouter>
        </TenantProvider>
      </QueryClientProvider>
    )

    expect(screen.queryByText(/Proyección del clima/)).not.toBeInTheDocument()
  })

  it('no muestra la sección de pronóstico si no hay coordenadas', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const data = fullData('moderna')
    if (data.basicData) {
      data.basicData.location = {
        city: 'Santiago',
        country: 'CL'
      }
    }

    render(
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          <MemoryRouter>
            <ContentSectionStack clientData={data} isLoading={false} />
          </MemoryRouter>
        </TenantProvider>
      </QueryClientProvider>
    )

    expect(screen.queryByText(/Proyección del clima/)).not.toBeInTheDocument()
  })

  it('en covered, la sección de pronóstico va antes de Noticias', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            daily: {
              time: ['2026-01-01'],
              weather_code: [0],
              temperature_2m_max: [20],
              temperature_2m_min: [10]
            }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    )

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const data = fullData('covered')
    if (data.basicData) {
      data.basicData.location = {
        city: 'Santiago',
        country: 'CL',
        latitude: -33.45,
        longitude: -70.66
      }
    }

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          <MemoryRouter>
            <ContentSectionStack clientData={data} isLoading={false} />
          </MemoryRouter>
        </TenantProvider>
      </QueryClientProvider>
    )

    await screen.findByText('Proyección del clima en Santiago')
    const titles = sectionTitles(container)
    expect(titles[0]).toBe('Proyección del clima en Santiago')
    expect(titles[1]).toBe('Noticias')
  })

  it('muestra la imagen de locutores en círculo en covered', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const data = fullData('covered')
    data.announcers = data.announcers.map((announcer) => ({
      ...announcer,
      imageUrl: 'https://cdn.example/announcer.png'
    }))

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          <MemoryRouter>
            <ContentSectionStack clientData={data} isLoading={false} />
          </MemoryRouter>
        </TenantProvider>
      </QueryClientProvider>
    )

    const image = container.querySelector('img[alt="Locutor 1"]')
    expect(image).not.toBeNull()
    expect(image!.className).toContain(contentStyles.avatar)
  })

  it('mantiene la imagen de locutores rectangular en otros templates', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const data = fullData('moderna')
    data.announcers = data.announcers.map((announcer) => ({
      ...announcer,
      imageUrl: 'https://cdn.example/announcer.png'
    }))

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          <MemoryRouter>
            <ContentSectionStack clientData={data} isLoading={false} />
          </MemoryRouter>
        </TenantProvider>
      </QueryClientProvider>
    )

    const image = container.querySelector('img[alt="Locutor 1"]')
    expect(image).not.toBeNull()
    expect(image!.className).toContain(contentStyles.media)
    expect(image!.className).not.toContain(contentStyles.avatar)
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})
