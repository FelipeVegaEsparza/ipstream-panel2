import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AdminStats } from '@/components/admin/AdminStats'

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div>Error: Acceso no autorizado</div>
  }

  // Obtener estadísticas globales del sistema
  const [
    totalClients,
    totalPrograms,
    totalNews,
    totalVideos,
    totalSponsors,
    totalPromotions,
    recentClients
  ] = await Promise.all([
    prisma.client.count(),
    prisma.program.count(),
    prisma.news.count(),
    prisma.rankingVideo.count(),
    prisma.sponsor.count(),
    prisma.promotion.count(),
    prisma.client.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            createdAt: true
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
      }
    })
  ])

  const stats = [
    {
      name: 'Total Clientes',
      value: totalClients,
      color: 'bg-blue-500',
      icon: 'users'
    },
    {
      name: 'Total Programas',
      value: totalPrograms,
      color: 'bg-green-500',
      icon: 'microphone'
    },
    {
      name: 'Total Noticias',
      value: totalNews,
      color: 'bg-purple-500',
      icon: 'newspaper'
    },
    {
      name: 'Total Videos',
      value: totalVideos,
      color: 'bg-red-500',
      icon: 'video'
    },
    {
      name: 'Total Sponsors',
      value: totalSponsors,
      color: 'bg-yellow-500',
      icon: 'building'
    },
    {
      name: 'Total Promociones',
      value: totalPromotions,
      color: 'bg-pink-500',
      icon: 'megaphone'
    }
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Dashboard Administrativo
        </h1>
        <p className="text-gray-400">
          Bienvenido al panel de administración de IPStream Panel
        </p>
      </div>

      <AdminStats stats={stats} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Clientes Recientes */}
        <div className="card">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <svg className="w-6 h-6 text-cyan-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            Clientes Recientes
          </h3>
          <div className="space-y-4">
            {recentClients.map((client) => (
              <div key={client.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                <div>
                  <h4 className="font-medium text-white">{client.name}</h4>
                  <p className="text-sm text-gray-400">{client.user.email}</p>
                  <p className="text-xs text-gray-500">
                    Registrado: {new Date(client.createdAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-300">
                    {client._count.programs + client._count.news + client._count.rankingVideos} elementos
                  </div>
                  <div className="text-xs text-gray-500">
                    {client._count.programs}P • {client._count.news}N • {client._count.rankingVideos}V
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Acciones Rápidas Admin */}
        <div className="card">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <svg className="w-6 h-6 text-cyan-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Acciones Rápidas
          </h3>
          <div className="space-y-3">
            <a
              href="/admin/users/new"
              className="block p-4 border border-gray-600 rounded-xl hover:bg-gray-700/50 hover:border-cyan-500/50 transition-all duration-200 group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-white">Crear Nuevo Cliente</div>
                  <div className="text-sm text-gray-400">Agregar un nuevo usuario al sistema</div>
                </div>
              </div>
            </a>
            <a
              href="/admin/users"
              className="block p-4 border border-gray-600 rounded-xl hover:bg-gray-700/50 hover:border-cyan-500/50 transition-all duration-200 group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-white">Gestionar Usuarios</div>
                  <div className="text-sm text-gray-400">Ver y administrar todos los clientes</div>
                </div>
              </div>
            </a>
            <a
              href="/admin/impersonate"
              className="block p-4 border border-gray-600 rounded-xl hover:bg-gray-700/50 hover:border-cyan-500/50 transition-all duration-200 group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-white">Impersonar Cliente</div>
                  <div className="text-sm text-gray-400">Entrar como cualquier cliente para soporte</div>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}