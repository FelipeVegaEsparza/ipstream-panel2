import { describe, expect, it } from 'vitest'
import { isReservedSlug, slugError, slugifyRadioName } from './domain-slug'

describe('domain-slug', () => {
  it('reserva los labels de infraestructura de CasterFly', () => {
    expect(isReservedSlug('casterfly')).toBe(true)
    expect(isReservedSlug('panel')).toBe(true)
    expect(isReservedSlug('stream')).toBe(true)
    expect(isReservedSlug('www')).toBe(true)
    expect(isReservedSlug('clientes')).toBe(true)
  })

  it('rechaza un nombre de radio que produce el label reservado casterfly', () => {
    const slug = slugifyRadioName('CasterFly')
    expect(slug).toBe('casterfly')
    expect(slugError(slug)).toBe('reserved')
  })

  it('acepta un nombre de radio normal', () => {
    expect(slugifyRadioName('Radio Corazón Ñuñoa')).toBe('radio-corazon-nunoa')
    expect(slugError('radio-corazon-nunoa')).toBeNull()
  })
})
