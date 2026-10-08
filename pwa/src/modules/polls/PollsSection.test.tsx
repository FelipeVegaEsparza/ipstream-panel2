import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TenantProvider } from '@/core/config/TenantContext'
import type { FullClientData } from '@/core/types'
import { PollsSection } from './PollsSection'

const baked = vi.hoisted(() => ({ clientId: null as string | null }))

vi.mock('@/core/config/tenant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/tenant')>()
  return {
    ...actual,
    getBakedClientId: () => baked.clientId,
    getBakedClientName: () => null
  }
})

function clientDataWithPolls(polls: FullClientData['polls']): FullClientData {
  return { polls } as unknown as FullClientData
}

describe('PollsSection', () => {
  it('no se renderiza sin encuestas', () => {
    baked.clientId = 'cmclient'
    render(
      <TenantProvider>
        <PollsSection clientData={clientDataWithPolls([])} isLoading={false} />
      </TenantProvider>
    )
    expect(screen.queryByText('Encuestas')).toBeNull()
  })

  it('se renderiza con encuestas activas', () => {
    baked.clientId = 'cmclient'
    render(
      <TenantProvider>
        <PollsSection
          clientData={clientDataWithPolls([
            {
              id: 'p1',
              title: '¿Qué género?',
              active: true,
              options: [{ id: 'o1', text: 'Rock', votes: 1 }],
              createdAt: '',
              updatedAt: ''
            }
          ])}
          isLoading={false}
        />
      </TenantProvider>
    )
    expect(screen.getByText('Encuestas')).toBeInTheDocument()
  })
})
