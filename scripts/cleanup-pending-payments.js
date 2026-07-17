/**
 * Script para limpiar pagos pendientes duplicados
 * Mantiene solo el pago pendiente más cercano por suscripción
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function cleanupPendingPayments() {
  console.log('🧹 Iniciando limpieza de pagos pendientes...\n')

  try {
    // Obtener todas las suscripciones activas
    const subscriptions = await prisma.subscription.findMany({
      where: { status: 'active' },
      include: {
        payments: {
          where: { status: 'pending' },
          orderBy: { dueDate: 'asc' }
        },
        client: {
          include: { user: true }
        }
      }
    })

    console.log(`📊 Encontradas ${subscriptions.length} suscripciones activas\n`)

    let totalDeleted = 0

    for (const subscription of subscriptions) {
      const pendingPayments = subscription.payments

      if (pendingPayments.length > 1) {
        console.log(`\n🔍 Suscripción: ${subscription.client.name}`)
        console.log(`   Cliente: ${subscription.client.user.email}`)
        console.log(`   Pagos pendientes encontrados: ${pendingPayments.length}`)

        // Mantener solo el primer pago (el más cercano)
        const [keepPayment, ...deletePayments] = pendingPayments

        console.log(`   ✅ Manteniendo: ${keepPayment.dueDate.toISOString().split('T')[0]}`)
        
        for (const payment of deletePayments) {
          console.log(`   ❌ Eliminando: ${payment.dueDate.toISOString().split('T')[0]}`)
          await prisma.payment.delete({
            where: { id: payment.id }
          })
          totalDeleted++
        }
      } else if (pendingPayments.length === 1) {
        console.log(`✓ ${subscription.client.name}: 1 pago pendiente (correcto)`)
      } else {
        console.log(`⚠️  ${subscription.client.name}: Sin pagos pendientes`)
      }
    }

    console.log(`\n✨ Limpieza completada!`)
    console.log(`📊 Total de pagos eliminados: ${totalDeleted}`)

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupPendingPayments()
