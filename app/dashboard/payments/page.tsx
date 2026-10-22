import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { ClientPaymentsView } from '@/components/dashboard/ClientPaymentsView'
import { paypalEnabled, PAYPAL_CURRENCIES } from '@/lib/paypal'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export default async function PaymentsPage() {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/login')
  }

  const effectiveClient = await getEffectiveClient()
  const clientId = effectiveClient?.clientId

  if (!clientId) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          {t('payments.noClient')}
        </h2>
        <p className="text-muted-foreground">
          {t('payments.contactAssign')}
        </p>
      </div>
    )
  }

  // Obtener información del cliente y su suscripción
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      plan: true,
      subscription: {
        include: {
          plan: true,
          payments: {
            where: { status: 'pending' },
            orderBy: { dueDate: 'asc' }
          }
        }
      }
    }
  })

  if (!client) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          {t('payments.clientNotFound')}
        </h2>
      </div>
    )
  }

  // Obtener historial de pagos
  const payments = await prisma.payment.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
    include: {
      subscription: {
        include: {
          plan: true
        }
      }
    }
  })

  return (
    <ClientPaymentsView
      client={client}
      payments={payments}
      paypalEnabled={paypalEnabled()}
      paypalCurrencies={PAYPAL_CURRENCIES}
    />
  )
}
