import { prisma } from '@/lib/prisma'
import { aiPeriod } from '@/lib/ai-live'
import type { AiUsageFeature } from '@/lib/ai-usage'
import { consumeExtraMusicSeconds, getAiCreditBalance } from '@/lib/ai-credits'

export interface AiMusicAccess {
  enabled: boolean
  limitSeconds: number
  usedSeconds: number
  remainingSeconds: number
  period: string
  planRemainingSeconds: number
  extraRemainingSeconds: number
  totalUsedSeconds: number
}

export async function getAiMusicAccess(clientId: string): Promise<AiMusicAccess> {
  const period = aiPeriod()
  let plan: { aiLiveEnabled: boolean; aiMusicMinutes: number } | null = null
  let usedSeconds = 0
  let extraRemainingSeconds = 0
  try {
    const [client, balance] = await Promise.all([
      prisma.client.findUnique({
        where: { id: clientId },
        select: {
          plan: { select: { aiLiveEnabled: true, aiMusicMinutes: true } },
          aiTtsUsage: { where: { period }, select: { musicSeconds: true } },
        },
      }),
      getAiCreditBalance(clientId),
    ])
    plan = client?.plan ?? null
    usedSeconds = client?.aiTtsUsage?.[0]?.musicSeconds ?? 0
    extraRemainingSeconds = balance.musicSeconds
  } catch (err) {
    console.error('[ai-music] no se pudo leer plan/cuota:', err)
  }
  const limitSeconds = Math.max(0, (plan?.aiMusicMinutes ?? 0) * 60)
  const enabled = Boolean(plan?.aiLiveEnabled) && (limitSeconds > 0 || extraRemainingSeconds > 0)
  const planRemainingSeconds = Math.max(0, limitSeconds - usedSeconds)
  return {
    enabled,
    limitSeconds,
    usedSeconds: Math.min(usedSeconds, limitSeconds),
    remainingSeconds: enabled ? planRemainingSeconds + extraRemainingSeconds : 0,
    period,
    planRemainingSeconds,
    extraRemainingSeconds,
    totalUsedSeconds: usedSeconds,
  }
}

export async function consumeAiMusicSeconds(
  clientId: string,
  seconds: number,
  feature: AiUsageFeature
): Promise<void> {
  const amount = Math.max(0, Math.floor(seconds))
  if (!amount) return
  const period = aiPeriod()
  await prisma.$transaction(async (tx) => {
    const [client, usage] = await Promise.all([
      tx.client.findUnique({
        where: { id: clientId },
        select: { plan: { select: { aiLiveEnabled: true, aiMusicMinutes: true } } },
      }),
      tx.aiTtsUsage.findUnique({
        where: { clientId_period: { clientId, period } },
        select: { musicSeconds: true },
      }),
    ])

    const limitSeconds = Math.max(0, (client?.plan?.aiMusicMinutes ?? 0) * 60)
    const usedSeconds = usage?.musicSeconds ?? 0
    const planRemainingSeconds = client?.plan?.aiLiveEnabled
      ? Math.max(0, limitSeconds - usedSeconds)
      : 0
    const fromPlan = Math.min(amount, planRemainingSeconds)
    const fromExtra = amount - fromPlan

    if (fromExtra > 0) {
      await consumeExtraMusicSeconds(tx, clientId, fromExtra)
    }

    await tx.aiTtsUsage.upsert({
      where: { clientId_period: { clientId, period } },
      create: { clientId, period, musicSeconds: amount, requests: 1 },
      update: { musicSeconds: { increment: amount }, requests: { increment: 1 } },
    })
    await tx.aiUsageEvent.create({
      data: { clientId, period, feature, musicSeconds: amount },
    })
  })
}
