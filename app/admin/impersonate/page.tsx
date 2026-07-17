import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ImpersonateList } from '@/components/admin/ImpersonateList'

export default async function ImpersonatePage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div>Error: Acceso no autorizado</div>
  }

  const clients = await prisma.client.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true
        }
      },
      basicData: {
        select: {
          projectName: true,
          logoUrl: true
        }
      },
      _count: {
        select: {
          programs: true,
          news: true,
          rankingVideos: true,
          sponsors: true,
          promotions: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Impersonar Cliente
        </h1>
        <p className="text-gray-400">
          Entra como cualquier cliente para brindar soporte técnico
        </p>
      </div>

      {/* Advertencia de seguridad */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-amber-300 mb-2">
              Importante - Uso Responsable
            </h3>
            <div className="text-amber-200/90 space-y-2 text-sm">
              <p>• La impersonación se registra en los logs del sistema</p>
              <p>• Solo usar para soporte técnico autorizado</p>
              <p>• Se abrirá una nueva pestaña con el dashboard del cliente</p>
              <p>• Tu sesión de administrador se mantiene intacta</p>
              <p>• Siempre habrá un indicador visual de impersonación</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="stat-card bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30">
          <div className="flex items-center justify-between">
            <div>
              <dt className="text-sm font-medium text-blue-400 mb-2">
                Total Clientes
              </dt>
              <dd className="text-2xl font-bold text-white">
                {clients.length}
              </dd>
            </div>
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
        </div>

        <div className="stat-card bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <dt className="text-sm font-medium text-green-400 mb-2">
                Con Contenido
              </dt>
              <dd className="text-2xl font-bold text-white">
                {clients.filter(c => {
                  const count = c._count
                  return count.programs > 0 || count.news > 0 || count.rankingVideos > 0
                }).length}
              </dd>
            </div>
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>

        <div className="stat-card bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <dt className="text-sm font-medium text-purple-400 mb-2">
                Activos Hoy
              </dt>
              <dd className="text-2xl font-bold text-white">
                {clients.filter(c => {
                  const today = new Date()
                  const clientDate = new Date(c.user.updatedAt)
                  return clientDate.toDateString() === today.toDateString()
                }).length}
              </dd>
            </div>
            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        <div className="stat-card bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <div>
              <dt className="text-sm font-medium text-cyan-400 mb-2">
                Con Logo
              </dt>
              <dd className="text-2xl font-bold text-white">
                {clients.filter(c => c.basicData?.logoUrl).length}
              </dd>
            </div>
            <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>

      <ImpersonateList clients={clients} />
    </div>
  )
}