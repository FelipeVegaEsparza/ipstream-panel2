#!/usr/bin/env node
// =====================================================
// CasterFly — precios USD de los planes públicos
// =====================================================
// Idempotente. Asegura una fila PlanPrice(USD) para los planes activos.
//
//   docker exec -it ipstream-app node scripts/sync-plan-usd.js
//   docker exec -it ipstream-app node scripts/sync-plan-usd.js --dry-run

const { PrismaClient } = require('@prisma/client')

const USD_BY_PLAN_NAME = {
  'Plan Radio Basico': 20,
  'Plan Radio Pro': 30,
  'Plan Tv Basico': 25,
  'Plan Tv Pro': 40,
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const prisma = new PrismaClient()
  try {
    const plans = await prisma.plan.findMany({
      where: { name: { in: Object.keys(USD_BY_PLAN_NAME) } },
      select: { id: true, name: true, isActive: true },
    })

    if (plans.length === 0) {
      console.log('No se encontraron planes con los nombres esperados.')
      return
    }

    for (const plan of plans) {
      const amount = USD_BY_PLAN_NAME[plan.name]
      if (typeof amount !== 'number') continue
      if (dryRun) {
        console.log(`dry-run: ${plan.name} (${plan.id}) → USD ${amount}`)
        continue
      }
      await prisma.planPrice.upsert({
        where: { planId_currency: { planId: plan.id, currency: 'USD' } },
        update: { amount },
        create: { planId: plan.id, currency: 'USD', amount },
      })
      console.log(`${plan.isActive ? 'activo' : 'inactivo'}: ${plan.name} → USD ${amount}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('Error sincronizando precios USD:', error)
  process.exit(1)
})
