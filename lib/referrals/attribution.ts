// =====================================================
// Programa de referidos — atribución en el registro
// =====================================================

import { prisma } from '@/lib/prisma'
import { recordReferralAudit } from './audit'
import { normalizeReferralCode } from './codes'
import { evaluateReferrerEligibility } from './eligibility'

export type AttributionReason =
  | 'applied'
  | 'invalid_code'
  | 'ineligible_referrer'
  | 'self_referral'
  | 'already_attributed'

export interface AttributionInput {
  code?: string | null
  email: string
  ip?: string | null
}

export interface AttributionResult {
  applied: boolean
  reason: AttributionReason
  referrerClientId?: string
  code?: string
  flagged: boolean
  flagReason?: string | null
}

export interface AttachReferralInput {
  referrerClientId: string
  referredClientId: string
  code: string
  signupIp?: string | null
  signupUserAgent?: string | null
  flagged?: boolean
  flagReason?: string | null
}

export function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase()
}

/**
 * Clave de comparación de emails: sin `+alias` y, en Gmail, sin puntos.
 * No se usa como identificador único; solo para detectar posibles duplicados.
 */
export function emailAliasKey(email: string): string {
  const normalized = normalizeEmail(email)
  const at = normalized.lastIndexOf('@')
  if (at < 0) return normalized
  let local = normalized.slice(0, at)
  const domain = normalized.slice(at + 1)
  const plus = local.indexOf('+')
  if (plus >= 0) local = local.slice(0, plus)
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    local = local.replace(/\./g, '')
  }
  return `${local}@${domain}`
}

export async function resolveReferralAttribution(
  input: AttributionInput,
  db: any = prisma
): Promise<AttributionResult> {
  const normalized = normalizeReferralCode(input.code)
  if (!normalized) {
    return { applied: false, reason: 'invalid_code', flagged: false }
  }

  const referrer = await db.client.findUnique({
    where: { referralCode: normalized },
    select: {
      id: true,
      legalAcceptedIp: true,
      user: { select: { email: true, isActive: true } },
      subscription: { select: { status: true } },
      payments: {
        select: {
          id: true,
          status: true,
          amount: true,
          paidAt: true,
          paymentMethod: true,
          transactionId: true,
          creditApplied: true,
          dueDate: true,
        },
        orderBy: { dueDate: 'asc' },
      },
    },
  })

  if (!referrer) {
    return { applied: false, reason: 'invalid_code', flagged: false }
  }

  const newEmail = normalizeEmail(input.email)
  const referrerEmail = normalizeEmail(referrer.user?.email || '')

  if (newEmail && newEmail === referrerEmail) {
    return {
      applied: false,
      reason: 'self_referral',
      referrerClientId: referrer.id,
      code: normalized,
      flagged: false,
    }
  }

  const eligibility = evaluateReferrerEligibility({
    isActive: referrer.user?.isActive,
    subscription: referrer.subscription,
    payments: referrer.payments,
  })
  if (!eligibility.eligible) {
    return {
      applied: false,
      reason: 'ineligible_referrer',
      referrerClientId: referrer.id,
      code: normalized,
      flagged: false,
    }
  }

  const sameIp = Boolean(
    input.ip &&
      input.ip !== 'unknown' &&
      referrer.legalAcceptedIp &&
      input.ip === referrer.legalAcceptedIp
  )
  const aliasMatch =
    Boolean(newEmail) &&
    Boolean(referrerEmail) &&
    newEmail !== referrerEmail &&
    emailAliasKey(newEmail) === emailAliasKey(referrerEmail)

  const flagged = sameIp || aliasMatch
  return {
    applied: true,
    reason: 'applied',
    referrerClientId: referrer.id,
    code: normalized,
    flagged,
    flagReason: sameIp ? 'same_ip' : aliasMatch ? 'email_alias' : null,
  }
}

/**
 * Crea la atribución. Si la cuenta ya tenía referente, no la reemplaza y deja
 * evidencia en la auditoría (el referente es inmutable después del registro).
 */
export async function attachReferralToClient(
  input: AttachReferralInput,
  db: any = prisma
) {
  const existing = await db.referral.findUnique({
    where: { referredClientId: input.referredClientId },
    select: { id: true, referrerClientId: true, code: true, status: true },
  })
  if (existing) {
    await recordReferralAudit(
      {
        actor: { role: 'system' },
        action: 'referral.attribution_rejected',
        clientId: input.referredClientId,
        referralId: existing.id,
        before: existing,
        reason: 'already_attributed',
      },
      db
    )
    return null
  }

  try {
    return await db.referral.create({
      data: {
        referrerClientId: input.referrerClientId,
        referredClientId: input.referredClientId,
        code: input.code,
        status: 'registered',
        flagged: Boolean(input.flagged),
        flagReason: input.flagReason ?? null,
        signupIp: input.signupIp ?? null,
        signupUserAgent: input.signupUserAgent ?? null,
      },
    })
  } catch (error: any) {
    // P2002 = violación del índice único de referredClientId (carrera).
    if (error?.code === 'P2002') {
      await recordReferralAudit(
        {
          actor: { role: 'system' },
          action: 'referral.attribution_rejected',
          clientId: input.referredClientId,
          reason: 'already_attributed',
        },
        db
      )
      return null
    }
    throw error
  }
}
