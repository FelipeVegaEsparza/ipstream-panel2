import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Section } from './Section'
import { SectionHeadingContext } from './SectionHeadingContext'

describe('Section', () => {
  it('no renderiza nada cuando visible es false', () => {
    const { container } = render(
      <Section title="Noticias" visible={false}>
        contenido
      </Section>
    )
    expect(container.querySelector('section')).toBeNull()
    expect(screen.queryByText('contenido')).toBeNull()
  })

  it('renderiza título y contenido cuando visible es true', () => {
    render(
      <Section title="Noticias" visible>
        contenido
      </Section>
    )
    expect(screen.getByText('Noticias')).toBeInTheDocument()
    expect(screen.getByText('contenido')).toBeInTheDocument()
  })

  it('muestra skeleton durante la carga y oculta el contenido', () => {
    const { container } = render(
      <Section title="Noticias" visible loading>
        contenido
      </Section>
    )
    expect(screen.queryByText('contenido')).toBeNull()
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })

  it('emite data-bg-text sólo cuando se pasa bgText', () => {
    const { container, rerender } = render(
      <Section title="Noticias" visible>
        contenido
      </Section>
    )
    expect(container.querySelector('h2')?.getAttribute('data-bg-text')).toBeNull()

    rerender(
      <Section title="Noticias" bgText="NOTICIAS" visible>
        contenido
      </Section>
    )
    expect(container.querySelector('h2')?.getAttribute('data-bg-text')).toBe('NOTICIAS')
  })

  it('en modo display usa el título como fondo y resalta la última palabra', () => {
    const { container } = render(
      <SectionHeadingContext.Provider value>
        <Section title="Últimas noticias" visible>
          contenido
        </Section>
      </SectionHeadingContext.Provider>
    )
    const heading = container.querySelector('h2')
    expect(heading?.getAttribute('data-bg-text')).toBe('Últimas noticias')
    expect(heading?.querySelector('span')?.textContent).toBe('noticias')
  })
})
