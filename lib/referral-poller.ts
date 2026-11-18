// =====================================================
// Poller de respaldo del programa de referidos
// =====================================================
// Recalcula referidos recientes y aplica créditos disponibles. Los hooks de
// pago siguen siendo la vía principal; este barrido cubre webhooks perdidos o
// procesos que se reiniciaron a mitad de camino.

import { prisma } from './prisma'
import { REFERRAL_SWEEP_WINDOW_DAYS, REFERRAL_STATUS } from './referrals/constants'
import { recalculateReferral } from './referrals/validation'
import { applyReferralCredits } from './referrals/credit'

const INTERVAL_MS = 15 * 60_000
let started = false
let timer: ReturnType<typeof setInterval> | null = null
let running = false

export async function runReferralSweep(now: Date = new Date()) {
  const since = new Date(
    now.getTime() - REFERRAL_SWEEP_WINDOW_DAYS * 24 * 60 * 60 * 1000
  )

  const pendingReferrals = await prisma.referral.findMany({
    where: {
      status: { notIn: [REFERRAL_STATUS.VALID, REFERRAL_STATUS.REJECTED] },
      updatedAt: { gte: since },
    },
    select: { id: true },
    take: 100,
    orderBy: { updatedAt: 'asc' },
  })

  let recalculated = 0
  for (const referral of pendingReferrals) {
    try {
      await recalculateReferral(referral.id)
      recalculated++
    } catch (error) {
      console.error('[referral-poller] Error recalculando referido', referral.id, error)
    }
  }

  const rewards = await prisma.referralReward.findMany({
    where: { status: 'available', remainingAmount: { gt: 0 } },
    select: { referrerClientId: true },
    take: 500,
    orderBy: { generatedAt: 'asc' },
  })
  const clients = Array.from(new Set(rewards.map((reward) => reward.referrerClientId)))

  let credited = 0
  for (const clientId of clients) {
    try {
      const result = await applyReferralCredits(clientId)
      if (result.applied > 0) credited++
    } catch (error) {
      console.error('[referral-poller] Error aplicando crédito', clientId, error)
    }
  }

  return { recalculated, credited }
}

export function startReferralPoller() {
  if (started) return
  started = true

  const run = async () => {
    if (running) return
    running = true
    try {
      await runReferralSweep()
    } catch (error) {
      console.error('[referral-poller]', error)
    } finally {
      running = false
    }
  }

  setTimeout(run, 15000)
  timer = setInterval(run, INTERVAL_MS)
  timer.unref?.()
}

export function stopReferralPoller() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  started = false
}
