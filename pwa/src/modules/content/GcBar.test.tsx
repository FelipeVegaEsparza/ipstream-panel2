import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GcBarMessage } from '@/core/types'
import { GcBar } from './GcBar'

function message(text: string, order: number): GcBarMessage {
  return {
    id: text,
    text,
    order,
    createdAt: '2026-09-26T20:00:00.000Z',
    updatedAt: '2026-09-26T20:00:00.000Z'
  }
}

describe('GcBar', () => {
  it('no renderiza nada sin mensajes', () => {
    for (const messages of [undefined, null, [], [message('   ', 0)]]) {
      const { container, unmount } = render(<GcBar messages={messages} />)
      expect(container.firstChild).toBeNull()
      unmount()
    }
  })

  it('muestra los mensajes ordenados por order', () => {
    render(
      <GcBar
        messages={[message('Segundo', 2), message('Primero', 1)]}
      />
    )

    const region = screen.getByLabelText('Mensajes')
    expect(region.textContent).toContain('Primero')
    expect(region.textContent).toContain('Segundo')
    expect(region.textContent?.indexOf('Primero')).toBeLessThan(
      region.textContent?.indexOf('Segundo') ?? -1
    )
  })

  it('duplica el contenido de forma accesible (copia aria-hidden)', () => {
    render(<GcBar messages={[message('Único mensaje', 0)]} />)

    expect(screen.getAllByText('Único mensaje')).toHaveLength(2)
    const region = screen.getByLabelText('Mensajes')
    const hiddenTexts = Array.from(
      region.querySelectorAll('[aria-hidden="true"]')
    )
    expect(
      hiddenTexts.some((el) => el.textContent?.includes('Único mensaje'))
    ).toBe(true)
  })
})
