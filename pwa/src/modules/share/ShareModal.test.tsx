import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShareModal } from './ShareModal'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('ShareModal', () => {
  it('limpia el timeout de "copiado" al desmontar antes de los 2s', async () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout')
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) }
    })

    const { unmount } = render(
      <ShareModal open onClose={() => {}} title="Radio" url="https://x/noticia" />
    )

    fireEvent.click(screen.getByRole('button', { name: /Copiar enlace/ }))
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByText('¡Enlace copiado!')).toBeInTheDocument()

    unmount()
    expect(clearSpy).toHaveBeenCalled()
  })
})
