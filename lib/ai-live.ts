// =====================================================
// IA en vivo — acceso por plan y cuota mensual de caracteres
// =====================================================
// La cuota se descuenta solo cuando ElevenLabs genera audio nuevo; los
// cache hits no consumen. El período es UTC (YYYY-MM).

import { prisma } from '@/lib/prisma'

export function aiPeriod(date = new Date()): string {
  return date.toISOString().slice(0, 7)
}

export interface AiLiveAccess {
  enabled: boolean
  limit: number
  used: number
  remaining: number
  period: string
}

export async function getAiLiveAccess(clientId: string): Promise<AiLiveAccess> {
  const period = aiPeriod()
  let plan: { aiLiveEnabled: boolean; aiMonthlyCharacters: number } | null = null
  let used = 0
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        plan: { select: { aiLiveEnabled: true, aiMonthlyCharacters: true } },
        aiTtsUsage: { where: { period }, select: { characters: true } },
      },
    })
    plan = client?.plan ?? null
    used = client?.aiTtsUsage?.[0]?.characters ?? 0
  } catch (error) {
    console.error('[ai-live] no se pudo leer el plan/cuota:', error)
  }

  const limit = Math.max(0, plan?.aiMonthlyCharacters ?? 0)
  const enabled = Boolean(plan?.aiLiveEnabled) && limit > 0
  return {
    enabled,
    limit,
    used,
    remaining: enabled ? Math.max(0, limit - used) : 0,
    period,
  }
}

export async function consumeAiCharacters(clientId: string, characters: number): Promise<void> {
  const amount = Math.max(0, Math.floor(characters))
  if (!amount) return
  const period = aiPeriod()
  await prisma.aiTtsUsage.upsert({
    where: { clientId_period: { clientId, period } },
    create: { clientId, period, characters: amount, requests: 1 },
    update: { characters: { increment: amount }, requests: { increment: 1 } },
  })
}
