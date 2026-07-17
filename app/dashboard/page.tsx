import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { PwaSubscribersCard } from '@/components/dashboard/PwaSubscribersCard'
import { PaymentStatusCard } from '@/components/dashboard/PaymentStatusCard'
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

  // Obtener estadísticas del cliente efectivo (real o impersonado)
  const [
    programsCount,
    newsCount,
    videosCount,
    sponsorsCount,
    promotionsCount,
    basicData,
    clientInfo,
    subscription
  ] = await Promise.all([
    prisma.program.count({ where: { clientId: effectiveClient.clientId } }),
    prisma.news.count({ where: { clientId: effectiveClient.clientId } }),
    prisma.rankingVideo.count({ where: { clientId: effectiveClient.clientId } }),
    prisma.sponsor.count({ where: { clientId: effectiveClient.clientId } }),
    prisma.promotion.count({ where: { clientId: effectiveClient.clientId } }),
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

  const stats = [
    {
      name: 'Programas',
      value: programsCount,
      href: '/dashboard/programs',
      color: 'bg-blue-500'
    },
    {
      name: 'Noticias',
      value: newsCount,
      href: '/dashboard/news',
      color: 'bg-green-500'
    },
    {
      name: 'Videos',
      value: videosCount,
      href: '/dashboard/videos',
      color: 'bg-purple-500'
    },
    {
      name: 'Auspiciadores',
      value: sponsorsCount,
      href: '/dashboard/sponsors',
      color: 'bg-yellow-500'
    },
    {
      name: 'Promociones',
      value: promotionsCount,
      href: '/dashboard/promotions',
      color: 'bg-red-500'
    }
  ]

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
        <div className="glass-effect rounded-xl p-4 mb-6">
          <p className="text-sm text-cyan-400">
            <strong>{effectiveClient.isImpersonating ? 'Client ID (Impersonado):' : 'Tu Client ID:'}</strong> 
            <code className="bg-gray-700/50 px-3 py-1 rounded-lg text-xs font-mono text-cyan-300 ml-2">{effectiveClient.clientId}</code>
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Usa este ID para acceder a tu API REST pública
          </p>
          {effectiveClient.isImpersonating && (
            <p className="text-xs text-amber-400 mt-2">
              ⚠️ Estás viendo los datos del cliente impersonado
            </p>
          )}
        </div>
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

      <DashboardStats stats={stats} />

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-medium text-white mb-6 flex items-center">
          <svg className="w-5 h-5 text-cyan-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Acciones Rápidas
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <a
            href="/dashboard/programs/new"
            className="flex flex-col items-center gap-2 p-4 border border-gray-600 rounded-xl hover:bg-gray-700/50 hover:border-cyan-500/50 transition-all duration-200 group text-center"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-white text-sm">Programa</div>
              <div className="text-xs text-gray-400">Añadir nuevo</div>
            </div>
          </a>
          <a
            href="/dashboard/news/new"
            className="flex flex-col items-center gap-2 p-4 border border-gray-600 rounded-xl hover:bg-gray-700/50 hover:border-cyan-500/50 transition-all duration-200 group text-center"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-white text-sm">Noticia</div>
              <div className="text-xs text-gray-400">Publicar ahora</div>
            </div>
          </a>
          <a
            href="/dashboard/promotions/new"
            className="flex flex-col items-center gap-2 p-4 border border-gray-600 rounded-xl hover:bg-gray-700/50 hover:border-cyan-500/50 transition-all duration-200 group text-center"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-white text-sm">Promoción</div>
              <div className="text-xs text-gray-400">Crear oferta</div>
            </div>
          </a>
          <a
            href="/dashboard/galleries/new"
            className="flex flex-col items-center gap-2 p-4 border border-gray-600 rounded-xl hover:bg-gray-700/50 hover:border-cyan-500/50 transition-all duration-200 group text-center"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-white text-sm">Galería</div>
              <div className="text-xs text-gray-400">Subir imágenes</div>
            </div>
          </a>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PaymentStatusCard
          nextPaymentDate={nextPaymentDate}
          planName={planName}
          planPrice={planPrice}
          status={paymentStatus}
        />
        <PwaSubscribersCard />
      </div>
    </div>
  )
}