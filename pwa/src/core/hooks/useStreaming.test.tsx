import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useStreaming } from './useStreaming'

const getStreaming = vi.hoisted(() => vi.fn())

vi.mock('@/core/api', () => ({ getStreaming }))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useStreaming: gating por enabled', () => {
  it('no consulta el streaming cuando enabled es false', () => {
    getStreaming.mockReset()
    renderHook(() => useStreaming('cmtest', { enabled: false }), { wrapper })
    expect(getStreaming).not.toHaveBeenCalled()
  })

  it('consulta el streaming cuando enabled es true (por defecto)', async () => {
    getStreaming.mockReset()
    getStreaming.mockResolvedValue({})
    renderHook(() => useStreaming('cmtest'), { wrapper })
    await waitFor(() => expect(getStreaming).toHaveBeenCalledTimes(1))
  })
})
