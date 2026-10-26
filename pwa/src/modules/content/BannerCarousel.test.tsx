import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Banner } from '@/core/types'
import { BannerCarousel } from './BannerCarousel'

function banner(id: string, overrides: Partial<Banner> = {}): Banner {
  return {
    id,
    imageUrl: `/${id}.webp`,
    linkUrl: null,
    order: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(() => ({
      matches: reduce,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('BannerCarousel', () => {
  it('no renderiza nada sin banners', () => {
    const { container } = render(<BannerCarousel banners={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('muestra un banner con enlace en una pestaña nueva', () => {
    render(
      <BannerCarousel
        banners={[banner('promo', { linkUrl: 'https://example.com/promo' })]}
        fallbackAlt="Radio Uno"
      />
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://example.com/promo')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByAltText('Radio Uno - banner 1')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Banner siguiente' })).toBeNull()
  })

  it('muestra un banner sin enlace como contenido no interactivo', () => {
    render(<BannerCarousel banners={[banner('solo-imagen')]} />)

    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByAltText('Banner 1')).toBeInTheDocument()
  })

  it('ignora enlaces con esquemas no permitidos', () => {
    render(
      <BannerCarousel banners={[banner('inseguro', { linkUrl: 'javascript:alert(1)' })]} />
    )

    expect(screen.queryByRole('link')).toBeNull()
  })

  it('navega manualmente entre varios banners e indicadores', () => {
    render(
      <BannerCarousel
        banners={[
          banner('uno', { order: 2, linkUrl: 'https://example.com/uno' }),
          banner('dos', { order: 1, linkUrl: 'https://example.com/dos' }),
        ]}
      />
    )

    expect(screen.getByRole('region', { name: 'Banners promocionales' })).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/dos')
    const first = screen.getByRole('button', { name: 'Ir al banner 1' })
    const second = screen.getByRole('button', { name: 'Ir al banner 2' })
    expect(first).toHaveAttribute('aria-current', 'true')

    fireEvent.click(second)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/uno')
    expect(second).toHaveAttribute('aria-current', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Banner anterior' }))
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/dos')

    fireEvent.click(screen.getByRole('button', { name: 'Banner siguiente' }))
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/uno')
  })

  it('rota automáticamente y se pausa con el puntero encima', () => {
    vi.useFakeTimers()
    render(
      <BannerCarousel
        banners={[
          banner('uno', { order: 1, linkUrl: 'https://example.com/uno' }),
          banner('dos', { order: 2, linkUrl: 'https://example.com/dos' }),
        ]}
      />
    )

    const region = screen.getByRole('region', { name: 'Banners promocionales' })
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/dos')

    fireEvent.mouseEnter(region)
    act(() => {
      vi.advanceTimersByTime(12000)
    })
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/dos')

    fireEvent.mouseLeave(region)
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/uno')
  })

  it('no rota automáticamente con movimiento reducido', () => {
    stubReducedMotion(true)
    vi.useFakeTimers()
    render(
      <BannerCarousel
        banners={[
          banner('uno', { order: 1, linkUrl: 'https://example.com/uno' }),
          banner('dos', { order: 2, linkUrl: 'https://example.com/dos' }),
        ]}
      />
    )

    act(() => {
      vi.advanceTimersByTime(12000)
    })

    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/uno')
  })

  it('descarta un banner cuya imagen no carga', () => {
    render(
      <BannerCarousel
        banners={[
          banner('roto', { order: 1 }),
          banner('ok', { order: 2, linkUrl: 'https://example.com/ok' }),
        ]}
      />
    )

    fireEvent.error(screen.getByAltText('Banner 1'))

    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/ok')
  })
})
