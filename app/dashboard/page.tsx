import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PaymentStatusCard } from '@/components/dashboard/PaymentStatusCard'
import { StreamingSection } from '@/components/dashboard/streaming/StreamingSection'
import { getEffectiveClient } from '@/lib/getEffectiveClient'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const effectiveClient = await getEffectiveClient()
  
  if (!session?.user) {
    return <div>Error: No hay sesión activa</div>
  }

  // Verificar que tenemos un cliente efectivo
  if (!effectiveClient) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          Error: No se encontró información del cliente
        </h3>
        <p className="text-gray-400 mb-4">
          No se pudo determinar el cliente para mostrar esta página
        </p>
        {session.user.role === 'ADMIN' ? (
          <a
            href="/admin"
            className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Ir al Dashboard
          </a>
        ) : (
          <a
            href="/auth/login"
            className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Iniciar Sesión
          </a>
        )}
      </div>
    )
  }

  const [
    basicData,
    clientInfo,
    subscription
  ] = await Promise.all([
    prisma.basicData.findUnique({ where: { clientId: effectiveClient.clientId } }),
    prisma.client.findUnique({ 
      where: { id: effectiveClient.clientId },
      include: { user: true, plan: true }
    }),
    prisma.subscription.findFirst({
      where: { 
        clientId: effectiveClient.clientId,
        status: 'ACTIVE'
      },
      include: { plan: true },
      orderBy: { endDate: 'desc' }
    })
  ])

  // Calcular estado de pago
  let paymentStatus: 'paid' | 'due-soon' | 'overdue' | 'no-plan' = 'no-plan'
  let nextPaymentDate: Date | null = null
  let planName: string | null = null
  let planPrice: number | null = null

  if (subscription && clientInfo?.plan) {
    planName = clientInfo.plan.name
    planPrice = clientInfo.plan.price
    
    // Buscar el próximo pago pendiente (el más cercano por dueDate)
    const nextPendingPayment = await prisma.payment.findFirst({
      where: {
        clientId: effectiveClient.clientId,
        subscriptionId: subscription.id,
        status: 'pending'
      },
      orderBy: { dueDate: 'asc' } // El más cercano primero
    })

    if (nextPendingPayment) {
      nextPaymentDate = nextPendingPayment.dueDate
      
      const now = new Date()
      const daysUntilPayment = Math.ceil((nextPaymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilPayment < 0) {
        paymentStatus = 'overdue'
      } else if (daysUntilPayment <= 7) {
        paymentStatus = 'due-soon'
      } else {
        paymentStatus = 'paid'
      }
    } else {
      // Si no hay pagos pendientes, usar la fecha de fin de la suscripción
      nextPaymentDate = subscription.endDate
      paymentStatus = 'paid'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Dashboard
          {effectiveClient.isImpersonating && (
            <span className="ml-3 px-3 py-1 text-sm bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">
              Modo Impersonación
            </span>
          )}
        </h1>
        <p className="text-gray-400 mb-6">
          {effectiveClient.isImpersonating && clientInfo ? (
            <>Viendo como: <strong className="text-white">{clientInfo.name}</strong> ({clientInfo.user.email})</>
          ) : (
            'Bienvenido a IPStream Panel'
          )}
        </p>

      </div>

      {!basicData && (
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-amber-300 mb-2">
                Completa tu información básica
              </h3>
              <p className="text-sm text-amber-200/80 mb-4">
                Para comenzar, completa la información básica de tu proyecto de radio.
              </p>
              <a
                href="/dashboard/basic-data"
                className="inline-flex items-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Completar información
              </a>
            </div>
          </div>
        </div>
      )}

      <StreamingSection />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PaymentStatusCard
          nextPaymentDate={nextPaymentDate}
          planName={planName}
          planPrice={planPrice}
          status={paymentStatus}
        />
      </div>
    </div>
  )
}