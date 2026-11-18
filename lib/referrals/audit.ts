// =====================================================
// Programa de referidos — auditoría administrativa
// =====================================================

import { prisma } from '@/lib/prisma'

export interface ReferralAuditActor {
  userId?: string | null
  role: string
}

export interface RecordReferralAuditInput {
  actor: ReferralAuditActor
  action: string
  clientId?: string | null
  referralId?: string | null
  rewardId?: string | null
  before?: unknown
  after?: unknown
  reason?: string | null
  ipAddress?: string | null
}

/** Registra una operación del programa. No existe endpoint para editar/borrar. */
export async function recordReferralAudit(
  input: RecordReferralAuditInput,
  db: any = prisma
) {
  return db.referralAuditLog.create({
    data: {
      actorUserId: input.actor.userId ?? null,
      actorRole: input.actor.role,
      action: input.action,
      clientId: input.clientId ?? null,
      referralId: input.referralId ?? null,
      rewardId: input.rewardId ?? null,
      before: input.before === undefined ? null : (input.before as any),
      after: input.after === undefined ? null : (input.after as any),
      reason: input.reason ?? null,
      ipAddress: input.ipAddress ?? null,
    },
  })
}
