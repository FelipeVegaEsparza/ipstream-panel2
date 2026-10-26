import type { Prisma } from '@prisma/client'
import { prisma, type PrismaDb } from '@/lib/prisma'

export const AI_CREDIT_TYPES = ['characters', 'music'] as const
export type AiCreditType = (typeof AI_CREDIT_TYPES)[number]

export interface AiCreditBalance {
  characters: number
  musicSeconds: number
}

export interface AiCreditPackSnapshot {
  characters: number
  musicSeconds: number
}

export interface CreateAiCreditGrantInput {
  clientId: string
  packId: string
  requestId?: string | null
  source: 'request' | 'admin'
  characters: number
  musicSeconds: number
  paymentId?: string | null
  note?: string | null
}

export function packCreditSnapshot(pack: {
  creditType: string
  amount: number
}): AiCreditPackSnapshot {
  const amount = Math.max(0, Math.floor(pack.amount))
  if (pack.creditType === 'music') {
    return { characters: 0, musicSeconds: amount * 60 }
  }
  return { characters: amount, musicSeconds: 0 }
}

export async function getAiCreditBalance(
  clientId: string,
  db: PrismaDb = prisma
): Promise<AiCreditBalance> {
  const aggregate = await db.aiCreditGrant.aggregate({
    where: { clientId },
    _sum: {
      remainingCharacters: true,
      remainingMusicSeconds: true,
    },
  })

  return {
    characters: aggregate._sum.remainingCharacters ?? 0,
    musicSeconds: aggregate._sum.remainingMusicSeconds ?? 0,
  }
}

export async function createAiCreditGrant(
  db: Prisma.TransactionClient | typeof prisma,
  input: CreateAiCreditGrantInput
) {
  return db.aiCreditGrant.create({
    data: {
      clientId: input.clientId,
      packId: input.packId,
      requestId: input.requestId ?? null,
      source: input.source,
      characters: input.characters,
      musicSeconds: input.musicSeconds,
      remainingCharacters: input.characters,
      remainingMusicSeconds: input.musicSeconds,
      paymentId: input.paymentId ?? null,
      note: input.note ?? null,
    },
  })
}

export async function consumeExtraCharacters(
  db: Prisma.TransactionClient,
  clientId: string,
  amount: number
): Promise<void> {
  let pending = Math.max(0, Math.floor(amount))
  if (!pending) return

  const grants = await db.aiCreditGrant.findMany({
    where: { clientId, remainingCharacters: { gt: 0 } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, remainingCharacters: true },
  })

  for (const grant of grants) {
    if (pending <= 0) break
    const take = Math.min(pending, grant.remainingCharacters)
    if (take <= 0) continue
    const result = await db.aiCreditGrant.updateMany({
      where: { id: grant.id, remainingCharacters: { gte: take } },
      data: { remainingCharacters: { decrement: take } },
    })
    if (result.count !== 1) throw new Error('insufficient_ai_credits')
    pending -= take
  }

  if (pending > 0) throw new Error('insufficient_ai_credits')
}

export async function consumeExtraMusicSeconds(
  db: Prisma.TransactionClient,
  clientId: string,
  amount: number
): Promise<void> {
  let pending = Math.max(0, Math.floor(amount))
  if (!pending) return

  const grants = await db.aiCreditGrant.findMany({
    where: { clientId, remainingMusicSeconds: { gt: 0 } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, remainingMusicSeconds: true },
  })

  for (const grant of grants) {
    if (pending <= 0) break
    const take = Math.min(pending, grant.remainingMusicSeconds)
    if (take <= 0) continue
    const result = await db.aiCreditGrant.updateMany({
      where: { id: grant.id, remainingMusicSeconds: { gte: take } },
      data: { remainingMusicSeconds: { decrement: take } },
    })
    if (result.count !== 1) throw new Error('insufficient_ai_credits')
    pending -= take
  }

  if (pending > 0) throw new Error('insufficient_ai_credits')
}


export async function getActiveAiCreditPacks() {
  return prisma.aiCreditPack.findMany({
    where: { isActive: true },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
  })
}

export async function getClientAiCreditRequests(clientId: string) {
  return prisma.aiCreditRequest.findMany({
    where: { clientId },
    include: {
      pack: {
        select: { id: true, name: true, creditType: true, amount: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
}
