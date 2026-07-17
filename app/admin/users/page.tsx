import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { PlusIcon } from '@heroicons/react/24/outline'
import { UsersList } from '@/components/admin/UsersList'

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div>Error: Acceso no autorizado</div>
  }

  const users = await prisma.user.findMany({
    where: { role: 'CLIENT' },
    include: {
      client: {
        include: {
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
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Gestión de Usuarios
          </h1>
          <p className="text-gray-400">
            Administra todos los clientes del sistema
          </p>
        </div>
        <Link
          href="/admin/users/new"
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Nuevo Cliente
        </Link>
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
                {users.length}
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
                Activos Hoy
              </dt>
              <dd className="text-2xl font-bold text-white">
                {users.filter(u => {
                  const today = new Date()
                  const userDate = new Date(u.updatedAt)
                  return userDate.toDateString() === today.toDateString()
                }).length}
              </dd>
            </div>
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="stat-card bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <dt className="text-sm font-medium text-purple-400 mb-2">
                Nuevos (7 días)
              </dt>
              <dd className="text-2xl font-bold text-white">
                {users.filter(u => {
                  const weekAgo = new Date()
                  weekAgo.setDate(weekAgo.getDate() - 7)
                  return new Date(u.createdAt) > weekAgo
                }).length}
              </dd>
            </div>
            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>

        <div className="stat-card bg-gradient-to-br from-amber-500/20 to-amber-600/20 border-amber-500/30">
          <div className="flex items-center justify-between">
            <div>
              <dt className="text-sm font-medium text-amber-400 mb-2">
                Con Contenido
              </dt>
              <dd className="text-2xl font-bold text-white">
                {users.filter(u => {
                  const count = u.client?._count
                  return count && (count.programs > 0 || count.news > 0 || count.rankingVideos > 0)
                }).length}
              </dd>
            </div>
            <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>
      </div>

      <UsersList users={users} />
    </div>
  )
}