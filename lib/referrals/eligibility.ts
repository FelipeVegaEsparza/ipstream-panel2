// =====================================================
// Programa de referidos — elegibilidad del referente
// =====================================================

import { prisma } from '@/lib/prisma'
import { SUBSCRIPTION_STATUS } from '@/lib/subscription-status'
import { isValidationPayment, type ValidationPaymentLike } from './payment-rules'

export type EligibilityReason =
  | 'eligible'
  | 'inactive_account'
  | 'no_subscription'
  | 'inactive_subscription'
  | 'no_paid_month'

export interface ReferrerEligibilityInput {
  isActive?: boolean | null
  subscription?: { status?: string | null } | null
  payments?: ValidationPaymentLike[] | null
}

export interface ReferrerEligibilityResult {
  eligible: boolean
  reason: EligibilityReason
}

export function evaluateReferrerEligibility(
  input: ReferrerEligibilityInput
): ReferrerEligibilityResult {
  if (!input.isActive) return { eligible: false, reason: 'inactive_account' }
  if (!input.subscription) return { eligible: false, reason: 'no_subscription' }
  if (input.subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
    return { eligible: false, reason: 'inactive_subscription' }
  }
  const hasPaidMonth = (input.payments || []).some((payment) => isValidationPayment(payment))
  if (!hasPaidMonth) return { eligible: false, reason: 'no_paid_month' }
  return { eligible: true, reason: 'eligible' }
}

const ELIGIBILITY_MESSAGES: Record<EligibilityReason, string> = {
  eligible: 'El cliente puede participar en el programa.',
  inactive_account: 'La cuenta debe estar activa para participar.',
  no_subscription: 'El cliente debe tener un plan y una suscripción activa.',
  inactive_subscription: 'La suscripción debe estar activa para participar.',
  no_paid_month: 'El cliente debe tener al menos una mensualidad pagada y confirmada.',
}

export function eligibilityMessage(reason: EligibilityReason): string {
  return ELIGIBILITY_MESSAGES[reason]
}

export class ReferralEligibilityError extends Error {
  reason: EligibilityReason
  constructor(reason: EligibilityReason) {
    super(ELIGIBILITY_MESSAGES[reason])
    this.name = 'ReferralEligibilityError'
    this.reason = reason
  }
}

export async function isReferrerEligible(
  clientId: string,
  db: any = prisma
): Promise<boolean> {
  const result = await getReferrerEligibility(clientId, db)
  return result.eligible
}

export async function getReferrerEligibility(
  clientId: string,
  db: any = prisma
): Promise<ReferrerEligibilityResult> {
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: {
      user: { select: { isActive: true } },
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

  if (!client) return { eligible: false, reason: 'inactive_account' }
  return evaluateReferrerEligibility({
    isActive: client.user?.isActive,
    subscription: client.subscription,
    payments: client.payments,
  })
}

export async function assertEligible(clientId: string, db: any = prisma): Promise<void> {
  const result = await getReferrerEligibility(clientId, db)
  if (!result.eligible) throw new ReferralEligibilityError(result.reason)
}
