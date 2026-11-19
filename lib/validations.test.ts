import { describe, expect, it } from 'vitest'
import { registerSchema, streamingPlaylistUpdateSchema } from './validations'

const base = {
  name: 'Radio Test',
  email: 'radio@test.cl',
  password: 'secreto123',
  radioName: 'Radio Test',
}

describe('registerSchema', () => {
  it('exige aceptar términos, privacidad y licencias', () => {
    expect(() => registerSchema.parse({ ...base, acceptLegal: false })).toThrow()
    expect(() => registerSchema.parse(base)).toThrow()
  })

  it('acepta el registro con la aceptación legal', () => {
    const parsed = registerSchema.parse({ ...base, acceptLegal: true })
    expect(parsed.acceptLegal).toBe(true)
  })
})

describe('streamingPlaylistUpdateSchema', () => {
  it('acepta intro/cierre y permite quitarlos con null', () => {
    expect(
      streamingPlaylistUpdateSchema.parse({
        introJingleId: 'jng_intro',
        outroJingleId: null,
      })
    ).toEqual({ introJingleId: 'jng_intro', outroJingleId: null })
  })

  it('rechaza identificadores vacíos', () => {
    expect(() => streamingPlaylistUpdateSchema.parse({ introJingleId: '' })).toThrow()
  })
})
