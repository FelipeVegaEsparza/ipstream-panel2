import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { DashboardI18nProvider } from '@/components/providers/DashboardI18nProvider'
import { NewsCapsulesSettings } from './NewsCapsulesSettings'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

describe('NewsCapsulesSettings', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/jingles/music')) {
        return new Response(JSON.stringify({ tracks: [], selectedId: null }), { status: 200 })
      }
      return new Response(JSON.stringify({ capsules: [] }), { status: 200 })
    }))
  })

  it('abre el editor con los datos de una cápsula existente', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/jingles/music')) {
        return new Response(JSON.stringify({ tracks: [], selectedId: null }), { status: 200 })
      }
      return new Response(JSON.stringify({
        capsules: [{
          id: 'capsule-1',
          title: 'Cápsula vieja',
          status: 'approved',
          scriptIntro: 'Intro guardada.',
          scriptBody: null,
          scriptClosing: 'Cierre guardado.',
          musicTrackId: null,
          musicTrack: null,
          audioUrl: null,
          audioDuration: null,
          approvedAt: null,
          previewedAt: null,
          priority: 5,
          minGapMinutes: 30,
          graceMinutes: 10,
          windowStart: null,
          windowEnd: null,
          activeFrom: null,
          activeTo: null,
          errorMessage: null,
          items: [{ id: 'i1', order: 0, title: 'Noticia uno', sourceUrl: null, publisher: null, sourceTitle: null, sourceText: 'Texto de la noticia uno.', summary: 'Resumen uno.' }],
          rules: [],
          nextEmissionAt: null,
          createdAt: new Date().toISOString(),
        }],
      }), { status: 200 })
    }))
    render(
      <DashboardI18nProvider locale="es">
        <NewsCapsulesSettings />
      </DashboardI18nProvider>
    )
    await waitFor(() => expect(screen.getByText('Cápsula vieja')).toBeInTheDocument())
    screen.getByRole('button', { name: 'Editar cápsula' }).click()
    await waitFor(() => expect(screen.getByDisplayValue('Cápsula vieja')).toBeInTheDocument())
    expect(screen.getByDisplayValue('Noticia uno')).toBeInTheDocument()
  })

  it('muestra el estado vacío y permite abrir el editor', async () => {
    render(
      <DashboardI18nProvider locale="es">
        <NewsCapsulesSettings />
      </DashboardI18nProvider>
    )
    await waitFor(() => expect(screen.getByText('Todavía no hay cápsulas de noticias.')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Nueva cápsula' })).toBeInTheDocument()
  })
})

  it('permite cambiar el horario desde Programación y guarda la regla', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/jingles/music')) {
        return new Response(JSON.stringify({ tracks: [], selectedId: null }), { status: 200 })
      }
      if (url.endsWith('/rules') && init?.method === 'PUT') {
        return new Response(JSON.stringify({
          capsule: {
            id: 'capsule-2', title: 'Con horario', status: 'approved',
            scriptIntro: '', scriptBody: null, scriptClosing: '',
            musicTrackId: null, musicTrack: null, audioUrl: '/a.mp3', audioDuration: 60,
            approvedAt: new Date().toISOString(), previewedAt: new Date().toISOString(),
            priority: 5, minGapMinutes: 30, graceMinutes: 10,
            windowStart: null, windowEnd: null, activeFrom: null, activeTo: null,
            errorMessage: null, items: [], rules: [], nextEmissionAt: null,
            createdAt: new Date().toISOString(),
          },
        }), { status: 200 })
      }
      return new Response(JSON.stringify({
        capsules: [{
          id: 'capsule-2',
          title: 'Con horario',
          status: 'approved',
          scriptIntro: '',
          scriptBody: null,
          scriptClosing: '',
          musicTrackId: null,
          musicTrack: null,
          audioUrl: '/a.mp3',
          audioDuration: 60,
          approvedAt: new Date().toISOString(),
          previewedAt: new Date().toISOString(),
          priority: 5,
          minGapMinutes: 30,
          graceMinutes: 10,
          windowStart: null,
          windowEnd: null,
          activeFrom: null,
          activeTo: null,
          errorMessage: null,
          items: [{ id: 'i1', order: 0, title: 'Noticia uno', sourceUrl: null, publisher: null, sourceTitle: null, sourceText: 'Texto', summary: 'Resumen.' }],
          rules: [{ id: 'r1', kind: 'times', config: { times: ['18:10'] }, days: null, active: true }],
          nextEmissionAt: null,
          createdAt: new Date().toISOString(),
        }],
      }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    render(
      <DashboardI18nProvider locale="es">
        <NewsCapsulesSettings />
      </DashboardI18nProvider>
    )
    await waitFor(() => expect(screen.getByText('Con horario')).toBeInTheDocument())
    screen.getByRole('button', { name: 'Programación' }).click()
    const input = await screen.findByDisplayValue('18:10')
    expect(input).toBeInTheDocument()
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.change(input, { target: { value: '21:30' } })
    screen.getByRole('button', { name: 'Guardar programación' }).click()
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/rules') && init?.method === 'PUT')
      expect(call).toBeTruthy()
      expect(JSON.parse(String(call?.[1]?.body))).toEqual({
        rules: [{ kind: 'times', config: { times: ['21:30'] }, active: true }],
      })
    })
  })

  it('carga las reglas frescas desde la API al abrir Programación', async () => {
    const capsuleBase = {
      id: 'capsule-3', title: 'Fresca', status: 'approved',
      scriptIntro: '', scriptBody: null, scriptClosing: '',
      musicTrackId: null, musicTrack: null, audioUrl: '/a.mp3', audioDuration: 60,
      approvedAt: new Date().toISOString(), previewedAt: new Date().toISOString(),
      priority: 5, minGapMinutes: 30, graceMinutes: 10,
      windowStart: null, windowEnd: null, activeFrom: null, activeTo: null,
      errorMessage: null, items: [], nextEmissionAt: null,
      createdAt: new Date().toISOString(),
    }
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/jingles/music')) {
        return new Response(JSON.stringify({ tracks: [], selectedId: null }), { status: 200 })
      }
      if (url.endsWith('/news-capsules/capsule-3')) {
        return new Response(JSON.stringify({
          capsule: { ...capsuleBase, rules: [{ id: 'r9', kind: 'times', config: { times: ['07:45'] }, days: null, active: true }] },
        }), { status: 200 })
      }
      return new Response(JSON.stringify({
        capsules: [{ ...capsuleBase, rules: [] }],
      }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    render(
      <DashboardI18nProvider locale="es">
        <NewsCapsulesSettings />
      </DashboardI18nProvider>
    )
    await waitFor(() => expect(screen.getByText('Fresca')).toBeInTheDocument())
    screen.getByRole('button', { name: 'Programación' }).click()
    expect(await screen.findByDisplayValue('07:45')).toBeInTheDocument()
  })

  it('avisa qué falta cuando no hay horario al guardar', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/jingles/music')) {
        return new Response(JSON.stringify({ tracks: [], selectedId: null }), { status: 200 })
      }
      return new Response(JSON.stringify({
        capsules: [{
          id: 'capsule-4', title: 'Sin reglas', status: 'approved',
          scriptIntro: '', scriptBody: null, scriptClosing: '',
          musicTrackId: null, musicTrack: null, audioUrl: '/a.mp3', audioDuration: 60,
          approvedAt: new Date().toISOString(), previewedAt: new Date().toISOString(),
          priority: 5, minGapMinutes: 30, graceMinutes: 10,
          windowStart: null, windowEnd: null, activeFrom: null, activeTo: null,
          errorMessage: null, items: [], rules: [], nextEmissionAt: null,
          createdAt: new Date().toISOString(),
        }],
      }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    render(
      <DashboardI18nProvider locale="es">
        <NewsCapsulesSettings />
      </DashboardI18nProvider>
    )
    await waitFor(() => expect(screen.getByText('Sin reglas')).toBeInTheDocument())
    screen.getByRole('button', { name: 'Programación' }).click()
    const save = await screen.findByRole('button', { name: 'Guardar programación' })
    save.click()
    await waitFor(() =>
      expect(screen.getByText('Definí al menos una hora o una frecuencia para programar la cápsula.')).toBeInTheDocument()
    )
  })
