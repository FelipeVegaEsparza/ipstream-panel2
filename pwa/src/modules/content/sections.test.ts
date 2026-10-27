import { describe, expect, it } from 'vitest'
import { getSectionOrder, SECTION_LABELS } from './sections'

describe('catálogo de secciones', () => {
  it('no incluye el chat como sección de contenido', () => {
    expect(Object.keys(SECTION_LABELS)).not.toContain('chat')

    for (const template of [
      'minimalista',
      'moderna',
      'blue',
      'moderno',
      'tradicional',
      'app',
      'petroleo',
      'petroleoblue',
      'playlist',
      'covered',
      'moderno2'
    ]) {
      expect(getSectionOrder(template)).not.toContain('chat')
    }
  })
})
