import { describe, expect, it } from 'vitest'
import type { FullClientData } from '@/core/types'
import {
  getSectionOrder,
  SECTION_LABELS,
  sectionHasContent,
} from './sections'

describe('sección de chat', () => {
  it('solo tiene contenido cuando el chat está habilitado', () => {
    expect(
      sectionHasContent('chat', { chatEnabled: true } as FullClientData, 0)
    ).toBe(true)
    expect(
      sectionHasContent('chat', { chatEnabled: false } as FullClientData, 0)
    ).toBe(false)
    expect(sectionHasContent('chat', {} as FullClientData, 0)).toBe(false)
  })

  it('está etiquetada y ordenada en todos los templates', () => {
    expect(SECTION_LABELS.chat).toBe('Chat en vivo')
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
      'moderno2',
    ]) {
      expect(getSectionOrder(template)).toContain('chat')
    }
  })
})
