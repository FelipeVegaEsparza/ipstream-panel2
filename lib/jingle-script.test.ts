import { describe, expect, it } from 'vitest'
import { splitJingleScript } from './jingle-script'

describe('splitJingleScript', () => {
  it('separa frases y conserva el contenido', () => {
    const parts = splitJingleScript('Hola a todos. La mejor música de la radio. Vení a escucharnos.')
    expect(parts).toHaveLength(3)
    expect(parts.join(' ')).toContain('Hola a todos.')
    expect(parts.join(' ')).toContain('Vení a escucharnos.')
  })

  it('junta frases demasiado cortas', () => {
    const parts = splitJingleScript('Sí. La mejor música las 24 horas.')
    expect(parts).toHaveLength(1)
    expect(parts[0]).toBe('Sí. La mejor música las 24 horas.')
  })

  it('limita la cantidad de frases a tres', () => {
    const parts = splitJingleScript(
      'Primera frase completa. Segunda frase completa. Tercera frase completa. Cuarta frase completa.'
    )
    expect(parts).toHaveLength(3)
    expect(parts[2]).toContain('Cuarta frase completa.')
  })

  it('mantiene una sola frase tal cual', () => {
    expect(splitJingleScript('La radio que te acompaña')).toEqual(['La radio que te acompaña'])
  })

  it('devuelve vacío sin texto', () => {
    expect(splitJingleScript('   ')).toEqual([])
  })
})
