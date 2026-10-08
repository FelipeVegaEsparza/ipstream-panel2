import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TenantProvider } from '@/core/config/TenantContext'
import { PlayerProvider } from '@/modules/player/PlayerContext'
import { PlayerBar } from './PlayerBar'
import styles from './PlayerBar.module.css'

vi.mock('@/core/hooks/useStreaming', () => ({
  useStreaming: () => ({ data: null })
}))

function renderBar(props: { vuMeter?: boolean } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <PlayerProvider>
          <MemoryRouter>
            <PlayerBar {...props} />
          </MemoryRouter>
        </PlayerProvider>
      </TenantProvider>
    </QueryClientProvider>
  )
}

describe('PlayerBar VU meter', () => {
  it('no muestra el fondo de VU por defecto', () => {
    const { container } = renderBar()
    expect(container.querySelector(`.${styles.vuBg}`)).toBeNull()
  })

  it('muestra el fondo de VU cuando vuMeter es true', () => {
    const { container } = renderBar({ vuMeter: true })
    expect(container.querySelector(`.${styles.vuBg}`)).not.toBeNull()
  })
})
