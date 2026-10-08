import { describe, expect, it } from 'vitest'
import { DEFAULT_TEMPLATE_ID, TEMPLATE_IDS, getTemplate } from './index'

describe('getTemplate', () => {
  it('devuelve un componente distinto para cada template registrado', () => {
    const components = TEMPLATE_IDS.map((id) => getTemplate(id))
    expect(components.every(Boolean)).toBe(true)
    expect(new Set(components).size).toBe(TEMPLATE_IDS.length)
  })

  it('devuelve el template por defecto ante id desconocido o nulo', () => {
    const fallback = getTemplate(DEFAULT_TEMPLATE_ID)
    expect(getTemplate('no-existe')).toBe(fallback)
    expect(getTemplate(null)).toBe(fallback)
    expect(getTemplate(undefined)).toBe(fallback)
  })
})
