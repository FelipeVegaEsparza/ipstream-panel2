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
