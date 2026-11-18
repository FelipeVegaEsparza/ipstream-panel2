import { describe, expect, it, vi } from 'vitest'
import {
  attachReferralToClient,
  emailAliasKey,
  normalizeEmail,
  resolveReferralAttribution,
} from './referrals/attribution'
import { registerSchema } from './validations'

function referrerDb(overrides: Record<string, unknown> = {}) {
  const referrer = {
    id: 'ref-client',
    legalAcceptedIp: '1.1.1.1',
    user: { email: 'dueno@radio.com', isActive: true },
    subscription: { status: 'active' },
    payments: [
      {
        id: 'p1',
        status: 'completed',
        amount: 10000,
        paidAt: new Date('2026-01-01'),
        paymentMethod: 'bank_transfer',
        transactionId: 'TX-1',
        creditApplied: 0,
        dueDate: new Date('2026-01-01'),
      },
    ],
    ...overrides,
  }
  return {
    client: { findUnique: vi.fn().mockResolvedValue(referrer) },
    referral: { findUnique: vi.fn(), create: vi.fn() },
    referralAuditLog: { create: vi.fn() },
  } as any
}

describe('registerSchema.referralCode', () => {
  it('acepta registros sin código', () => {
    const parsed = registerSchema.parse({
      name: 'Ana',
      email: 'ana@test.com',
      password: 'secreto1',
      radioName: 'Radio Ana',
      acceptLegal: true,
    })
    expect(parsed.referralCode).toBeUndefined()
  })

  it('normaliza el código y rechaza caracteres inválidos', () => {
    const parsed = registerSchema.parse({
      name: 'Ana',
      email: 'ana@test.com',
      password: 'secreto1',
      radioName: 'Radio Ana',
      acceptLegal: true,
      referralCode: '  CAST-ABC123  ',
    })
    expect(parsed.referralCode).toBe('CAST-ABC123')
    expect(() =>
      registerSchema.parse({
        name: 'Ana',
        email: 'ana@test.com',
        password: 'secreto1',
        radioName: 'Radio Ana',
        acceptLegal: true,
        referralCode: 'CAST/ABC',
      })
    ).toThrow()
  })
})

describe('resolveReferralAttribution', () => {
  it('aplica un código válido de un referente elegible', async () => {
    const db = referrerDb()
    const result = await resolveReferralAttribution(
      { code: 'cast-abc123', email: 'nuevo@test.com', ip: '2.2.2.2' },
      db
    )
    expect(result).toMatchObject({
      applied: true,
      reason: 'applied',
      referrerClientId: 'ref-client',
      code: 'CAST-ABC123',
      flagged: false,
    })
  })

  it('ignora códigos inexistentes', async () => {
    const db = referrerDb()
    db.client.findUnique.mockResolvedValue(null)
    await expect(
      resolveReferralAttribution({ code: 'CAST-NOPE', email: 'nuevo@test.com' }, db)
    ).resolves.toMatchObject({ applied: false, reason: 'invalid_code' })
  })

  it('ignora referentes no elegibles', async () => {
    const db = referrerDb()
    db.client.findUnique.mockResolvedValue({
      ...(await db.client.findUnique()),
      payments: [],
    })
    await expect(
      resolveReferralAttribution({ code: 'CAST-ABC123', email: 'nuevo@test.com' }, db)
    ).resolves.toMatchObject({ applied: false, reason: 'ineligible_referrer' })
  })

  it('bloquea el uso del propio email (auto-referencia)', async () => {
    const db = referrerDb()
    await expect(
      resolveReferralAttribution(
        { code: 'CAST-ABC123', email: 'DUENO@radio.com', ip: '9.9.9.9' },
        db
      )
    ).resolves.toMatchObject({ applied: false, reason: 'self_referral' })
  })

  it('marca para revisión una variante de email', async () => {
    const db = referrerDb()
    const result = await resolveReferralAttribution(
      { code: 'CAST-ABC123', email: 'dueno+promo@radio.com', ip: '9.9.9.9' },
      db
    )
    expect(result.applied).toBe(true)
    expect(result.flagged).toBe(true)
    expect(result.flagReason).toBe('email_alias')
  })

  it('marca para revisión cuando coincide la IP de registro', async () => {
    const db = referrerDb()
    const result = await resolveReferralAttribution(
      { code: 'CAST-ABC123', email: 'nuevo@test.com', ip: '1.1.1.1' },
      db
    )
    expect(result.flagged).toBe(true)
    expect(result.flagReason).toBe('same_ip')
  })
})

describe('attachReferralToClient', () => {
  it('crea la atribución cuando la cuenta es nueva', async () => {
    const db = referrerDb()
    db.referral.findUnique.mockResolvedValue(null)
    db.referral.create.mockResolvedValue({ id: 'r1' })
    await expect(
      attachReferralToClient(
        {
          referrerClientId: 'ref-client',
          referredClientId: 'new-client',
          code: 'CAST-ABC123',
          signupIp: '2.2.2.2',
          signupUserAgent: 'UA',
        },
        db
      )
    ).resolves.toEqual({ id: 'r1' })
    expect(db.referral.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        referrerClientId: 'ref-client',
        referredClientId: 'new-client',
        code: 'CAST-ABC123',
        status: 'registered',
      }),
    })
  })

  it('no reemplaza un referente existente y deja auditoría', async () => {
    const db = referrerDb()
    db.referral.findUnique.mockResolvedValue({
      id: 'r1',
      referrerClientId: 'otro',
      code: 'CAST-OTRO',
      status: 'registered',
    })
    await expect(
      attachReferralToClient(
        {
          referrerClientId: 'ref-client',
          referredClientId: 'new-client',
          code: 'CAST-ABC123',
        },
        db
      )
    ).resolves.toBeNull()
    expect(db.referral.create).not.toHaveBeenCalled()
    expect(db.referralAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'referral.attribution_rejected',
        reason: 'already_attributed',
      }),
    })
  })

  it('resuelve una carrera de atribución sin romper el registro', async () => {
    const db = referrerDb()
    db.referral.findUnique.mockResolvedValue(null)
    db.referral.create.mockRejectedValue({ code: 'P2002' })
    await expect(
      attachReferralToClient(
        {
          referrerClientId: 'ref-client',
          referredClientId: 'new-client',
          code: 'CAST-ABC123',
        },
        db
      )
    ).resolves.toBeNull()
    expect(db.referralAuditLog.create).toHaveBeenCalled()
  })
})

describe('normalización de emails', () => {
  it('normaliza mayúsculas y variantes de Gmail', () => {
    expect(normalizeEmail('  A@B.COM ')).toBe('a@b.com')
    expect(emailAliasKey('Juan.Perez+radio@gmail.com')).toBe('juanperez@gmail.com')
    expect(emailAliasKey('juanperez@gmail.com')).toBe('juanperez@gmail.com')
  })
})
