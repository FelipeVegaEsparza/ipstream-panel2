import { describe, expect, it, vi } from 'vitest'
import {
  buildReferralCode,
  buildReferralLink,
  ensureReferralCode,
  isValidReferralCodeFormat,
  normalizeBaseUrl,
  normalizeReferralCode,
  slugifyReferralName,
} from './referrals/codes'

function clientDb(overrides: Record<string, unknown> = {}) {
  return {
    client: {
      findUnique: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      ...overrides,
    },
  } as any
}

describe('buildReferralCode', () => {
  it('genera el formato CAST-NOMBRE + sufijo', () => {
    expect(buildReferralCode('Felipe', 'ABC')).toBe('CAST-FELIPEABC')
  })

  it('normaliza acentos y caracteres especiales', () => {
    expect(slugifyReferralName('Radio Ñuble FM')).toBe('RADIONUB')
    expect(buildReferralCode('Radio Ñuble FM', 'x9')).toBe('CAST-RADIONUBX9')
  })

  it('respeta el largo máximo', () => {
    const code = buildReferralCode('NombreMuchisimoMasLargoDeLoPermitido', 'ABC123')
    expect(code.length).toBeLessThanOrEqual(32)
  })

  it('normaliza y valida el formato', () => {
    expect(normalizeReferralCode(' cast-abc123 ')).toBe('CAST-ABC123')
    expect(isValidReferralCodeFormat('CAST-ABC123')).toBe(true)
    expect(isValidReferralCodeFormat('ABC123')).toBe(false)
    expect(isValidReferralCodeFormat('CAST-')).toBe(false)
  })
})

describe('enlaces de referido', () => {
  it('construye el enlace con el dominio configurado', () => {
    expect(buildReferralLink('CAST-ABC', 'casterfly.com')).toBe(
      'https://casterfly.com/registro?ref=CAST-ABC'
    )
  })

  it('normaliza el dominio y evita dobles barras', () => {
    expect(normalizeBaseUrl('https://casterfly.com/')).toBe('https://casterfly.com')
    expect(buildReferralLink('CAST ABC', 'https://casterfly.com/')).toBe(
      'https://casterfly.com/registro?ref=CAST%20ABC'
    )
  })
})

describe('ensureReferralCode', () => {
  it('devuelve el código existente sin escribir', async () => {
    const db = clientDb()
    db.client.findUnique.mockResolvedValue({
      id: 'c1',
      name: 'Radio Uno',
      referralCode: 'CAST-RADIOUNOABC',
    })
    await expect(ensureReferralCode('c1', db)).resolves.toBe('CAST-RADIOUNOABC')
    expect(db.client.updateMany).not.toHaveBeenCalled()
  })

  it('genera y persiste un código cuando no existe', async () => {
    const db = clientDb()
    db.client.findUnique
      .mockResolvedValueOnce({ id: 'c1', name: 'Radio Uno', referralCode: null })
      .mockResolvedValueOnce(null) // código no tomado
    await expect(ensureReferralCode('c1', db)).resolves.toMatch(/^CAST-RADIOUNO[A-Z0-9]{3}$/)
    expect(db.client.updateMany).toHaveBeenCalledWith({
      where: { id: 'c1', referralCode: null },
      data: { referralCode: expect.stringMatching(/^CAST-/) },
    })
  })

  it('relee el código ganador si otra petición escribió primero', async () => {
    const db = clientDb()
    db.client.findUnique
      .mockResolvedValueOnce({ id: 'c1', name: 'Radio Uno', referralCode: null })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ referralCode: 'CAST-RADIOUNOXYZ' })
    db.client.updateMany.mockResolvedValue({ count: 0 })
    await expect(ensureReferralCode('c1', db)).resolves.toBe('CAST-RADIOUNOXYZ')
  })

  it('lanza error si el cliente no existe', async () => {
    const db = clientDb()
    db.client.findUnique.mockResolvedValue(null)
    await expect(ensureReferralCode('missing', db)).rejects.toThrow('Cliente no encontrado')
  })
})
