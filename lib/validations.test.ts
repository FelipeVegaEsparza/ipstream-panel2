import { describe, expect, it } from 'vitest'
import { registerSchema } from './validations'

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
