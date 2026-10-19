import { prisma } from '@/lib/prisma'
import { aiPeriod } from '@/lib/ai-live'

export interface AiMusicAccess {
  enabled: boolean
  limitSeconds: number
  usedSeconds: number
  remainingSeconds: number
  period: string
}

export async function getAiMusicAccess(clientId: string): Promise<AiMusicAccess> {
  const period = aiPeriod()
  let plan: { aiLiveEnabled: boolean; aiMusicMinutes: number } | null = null
  let usedSeconds = 0
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        plan: { select: { aiLiveEnabled: true, aiMusicMinutes: true } },
        aiTtsUsage: { where: { period }, select: { musicSeconds: true } },
      },
    })
    plan = client?.plan ?? null
    usedSeconds = client?.aiTtsUsage?.[0]?.musicSeconds ?? 0
  } catch (err) {
    console.error('[ai-music] no se pudo leer plan/cuota:', err)
  }
  const limitSeconds = Math.max(0, (plan?.aiMusicMinutes ?? 0) * 60)
  const enabled = Boolean(plan?.aiLiveEnabled) && limitSeconds > 0
  return {
    enabled,
    limitSeconds,
    usedSeconds,
    remainingSeconds: enabled ? Math.max(0, limitSeconds - usedSeconds) : 0,
    period,
  }
}

export async function consumeAiMusicSeconds(clientId: string, seconds: number): Promise<void> {
  const amount = Math.max(0, Math.floor(seconds))
  if (!amount) return
  const period = aiPeriod()
  await prisma.aiTtsUsage.upsert({
    where: { clientId_period: { clientId, period } },
    create: { clientId, period, musicSeconds: amount, requests: 1 },
    update: { musicSeconds: { increment: amount }, requests: { increment: 1 } },
  })
}
