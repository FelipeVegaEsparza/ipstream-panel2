import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SmartImage } from './SmartImage'

afterEach(() => {
  vi.useRealTimers()
})

describe('SmartImage', () => {
  it('resuelve rutas relativas a URLs absolutas', () => {
    render(<SmartImage src="/api/uploads/cmx/logo.png" alt="Logo" />)
    const img = screen.getByAltText('Logo')
    expect(img).toHaveAttribute(
      'src',
      'https://panelipstream.cl/api/uploads/cmx/logo.png'
    )
  })

  it('aplica lazy loading', () => {
    render(<SmartImage src="https://cdn.ejemplo.cl/x.webp" alt="Imagen" />)
    expect(screen.getByAltText('Imagen')).toHaveAttribute('loading', 'lazy')
  })

  it('no renderiza nada sin src', () => {
    const { container } = render(<SmartImage src={null} alt="Vacía" />)
    expect(container.querySelector('img')).toBeNull()
  })

  it('usa el fallback cuando la imagen falla', () => {
    render(
      <SmartImage
        src="/api/dashboard/library/cover"
        fallbacks={['/api/uploads/cmx/logo.png']}
        alt="Portada"
      />
    )
    const img = screen.getByAltText('Portada')
    fireEvent.error(img)
    expect(screen.getByAltText('Portada')).toHaveAttribute(
      'src',
      'https://panelipstream.cl/api/uploads/cmx/logo.png'
    )
  })

  it('oculta la imagen si todos los candidatos fallan', () => {
    render(
      <SmartImage
        src="/api/dashboard/library/cover"
        fallbacks={['/api/uploads/cmx/logo.png']}
        alt="Portada"
      />
    )
    const img = screen.getByAltText('Portada')
    fireEvent.error(img)
    fireEvent.error(screen.getByAltText('Portada'))
    expect(screen.queryByAltText('Portada')).toBeNull()
  })
})

describe('SmartImage crossfade', () => {
  it('mantiene la imagen anterior y promueve la nueva tras el fundido', () => {
    vi.useFakeTimers()
    const { rerender } = render(
      <SmartImage src="/a.png" alt="A" crossfade />
    )
    expect(screen.getByAltText('A')).toHaveAttribute(
      'src',
      'https://panelipstream.cl/a.png'
    )

    rerender(<SmartImage src="/b.png" alt="A" crossfade />)
    // La anterior sigue visible y aparece la entrante (decorativa).
    expect(screen.getByAltText('A')).toHaveAttribute(
      'src',
      'https://panelipstream.cl/a.png'
    )
    const imgs = document.querySelectorAll('img')
    expect(imgs.length).toBe(2)

    fireEvent.load(imgs[1]!)
    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(screen.getByAltText('A')).toHaveAttribute(
      'src',
      'https://panelipstream.cl/b.png'
    )
    expect(document.querySelectorAll('img').length).toBe(1)
  })

  it('avanza al fallback si la imagen base falla', () => {
    render(
      <SmartImage
        src="/api/dashboard/library/cover"
        fallbacks={['/api/uploads/cmx/logo.png']}
        alt="Portada"
        crossfade
      />
    )
    fireEvent.error(screen.getByAltText('Portada'))
    expect(screen.getByAltText('Portada')).toHaveAttribute(
      'src',
      'https://panelipstream.cl/api/uploads/cmx/logo.png'
    )
  })
})
