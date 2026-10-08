import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TenantProvider } from '@/core/config/TenantContext'
import { PlayerProvider } from '@/modules/player/PlayerContext'
import type { FullClientData } from '@/core/types'
import { getTemplate, TemplateSlot } from './index'

const baked = vi.hoisted(() => ({ clientId: null as string | null }))

vi.mock('@/core/config/tenant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/tenant')>()
  return {
    ...actual,
    getBakedClientId: () => baked.clientId,
    getBakedClientName: () => null
  }
})

const NEW_TEMPLATES: Array<{ id: string; label?: string }> = [
  { id: 'blue', label: 'Blue' },
  { id: 'moderno', label: 'Moderno' },
  { id: 'tradicional', label: 'Tradicional' },
  { id: 'app', label: 'App' },
  { id: 'petroleo' },
  { id: 'petroleoblue' },
  { id: 'playlist', label: 'Playlist' },
  { id: 'moderno2' }
]

const clientData = {
  basicData: { projectName: 'Radio Test' },
  gcBar: [{ id: 'gc1', text: 'Mensaje GC', order: 0 }]
} as unknown as FullClientData

function renderTemplate(templateId: string, data: FullClientData = clientData) {
  const Template = getTemplate(templateId)
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <PlayerProvider>
          <MemoryRouter>
            <Template clientData={data} isLoading={false} />
          </MemoryRouter>
        </PlayerProvider>
      </TenantProvider>
    </QueryClientProvider>
  )
}

describe('templates nuevos', () => {
  it('cada template renderiza su badge sin romper', async () => {
    baked.clientId = 'cmtest'
    for (const template of NEW_TEMPLATES) {
      const { unmount } = renderTemplate(template.id)
      if (template.label) {
        expect(screen.getByText(template.label)).toBeInTheDocument()
      }
      expect((await screen.findAllByText('Radio Test')).length).toBeGreaterThan(0)
      expect(screen.getAllByText('Mensaje GC').length).toBeGreaterThan(0)
      unmount()
    }
  })

  it('blue no muestra los botones de instalar en el menú', () => {
    baked.clientId = 'cmtest'
    renderTemplate('blue')
    expect(
      screen.queryByRole('button', { name: 'Instalar en Android' })
    ).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Instalar en iPhone o iPad' })
    ).toBeNull()
  })

  it('cada template renderiza el video en modo solo TV', () => {
    baked.clientId = 'cmtest'
    const tvData = {
      basicData: {
        projectName: 'Radio Test',
        radioStreamingUrl: null,
        videoStreamingUrl: 'https://panelipstream.cl/tv/tv_test.m3u8'
      },
      gcBar: []
    } as unknown as FullClientData

    for (const template of NEW_TEMPLATES) {
      const { container, unmount } = renderTemplate(template.id, tvData)
      expect(container.querySelector('video')).not.toBeNull()
      unmount()
    }
  })

  it('aplica el accentColor del cliente como token global', () => {
    baked.clientId = 'cmtest'
    const data = {
      ...clientData,
      accentColor: '#ff6b00'
    } as unknown as FullClientData
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })

    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          <PlayerProvider>
            <MemoryRouter>
              <TemplateSlot
                templateId="moderno2"
                clientData={data}
                isLoading={false}
              />
            </MemoryRouter>
          </PlayerProvider>
        </TenantProvider>
      </QueryClientProvider>
    )

    expect(
      document.documentElement.style.getPropertyValue('--brand-accent')
    ).toBe('#ff6b00')

    unmount()
    expect(
      document.documentElement.style.getPropertyValue('--brand-accent')
    ).toBe('')
  })
})

afterEach(() => {
  const root = document.documentElement
  for (const token of [
    '--brand-accent',
    '--brand-accent-hover',
    '--brand-accent-rgb',
    '--brand-accent-soft',
    '--brand-accent-contrast',
    '--brand-accent-on'
  ]) {
    root.style.removeProperty(token)
  }
})
