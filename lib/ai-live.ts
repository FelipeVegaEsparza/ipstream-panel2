// =====================================================
// IA en vivo — acceso por plan y cuota mensual de caracteres
// =====================================================
// La cuota se descuenta solo cuando ElevenLabs genera audio nuevo; los
// cache hits no consumen. El período es UTC (YYYY-MM).

import { prisma } from '@/lib/prisma'
import type { AiUsageFeature } from '@/lib/ai-usage'
import { consumeExtraCharacters, getAiCreditBalance } from '@/lib/ai-credits'

export function aiPeriod(date = new Date()): string {
  return date.toISOString().slice(0, 7)
}

export interface AiLiveAccess {
  enabled: boolean
  limit: number
  used: number
  remaining: number
  period: string
  planRemaining: number
  extraRemaining: number
  totalUsed: number
}

export async function getAiLiveAccess(clientId: string): Promise<AiLiveAccess> {
  const period = aiPeriod()
  let plan: { aiLiveEnabled: boolean; aiMonthlyCharacters: number } | null = null
  let used = 0
  let extraRemaining = 0
  try {
    const [client, balance] = await Promise.all([
      prisma.client.findUnique({
        where: { id: clientId },
        select: {
          plan: { select: { aiLiveEnabled: true, aiMonthlyCharacters: true } },
          aiTtsUsage: { where: { period }, select: { characters: true } },
        },
      }),
      getAiCreditBalance(clientId),
    ])
    plan = client?.plan ?? null
    used = client?.aiTtsUsage?.[0]?.characters ?? 0
    extraRemaining = balance.characters
  } catch (error) {
    console.error('[ai-live] no se pudo leer el plan/cuota:', error)
  }

  const limit = Math.max(0, plan?.aiMonthlyCharacters ?? 0)
  const enabled = Boolean(plan?.aiLiveEnabled) && (limit > 0 || extraRemaining > 0)
  const planRemaining = Math.max(0, limit - used)
  return {
    enabled,
    limit,
    used: Math.min(used, limit),
    remaining: enabled ? planRemaining + extraRemaining : 0,
    period,
    planRemaining,
    extraRemaining,
    totalUsed: used,
  }
}

export async function consumeAiCharacters(
  clientId: string,
  characters: number,
  feature: AiUsageFeature
): Promise<void> {
  const amount = Math.max(0, Math.floor(characters))
  if (!amount) return
  const period = aiPeriod()
  await prisma.$transaction(async (tx) => {
    const [client, usage] = await Promise.all([
      tx.client.findUnique({
        where: { id: clientId },
        select: { plan: { select: { aiLiveEnabled: true, aiMonthlyCharacters: true } } },
      }),
      tx.aiTtsUsage.findUnique({
        where: { clientId_period: { clientId, period } },
        select: { characters: true },
      }),
    ])

    const limit = Math.max(0, client?.plan?.aiMonthlyCharacters ?? 0)
    const used = usage?.characters ?? 0
    const planRemaining = client?.plan?.aiLiveEnabled
      ? Math.max(0, limit - used)
      : 0
    const fromPlan = Math.min(amount, planRemaining)
    const fromExtra = amount - fromPlan

    if (fromExtra > 0) {
      await consumeExtraCharacters(tx, clientId, fromExtra)
    }

    await tx.aiTtsUsage.upsert({
      where: { clientId_period: { clientId, period } },
      create: { clientId, period, characters: amount, requests: 1 },
      update: { characters: { increment: amount }, requests: { increment: 1 } },
    })
    await tx.aiUsageEvent.create({
      data: { clientId, period, feature, characters: amount },
    })
  })
}
