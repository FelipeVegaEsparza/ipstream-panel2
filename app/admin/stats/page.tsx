import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatsOverview } from '@/components/admin/StatsOverview'
import { StatsCharts } from '@/components/admin/StatsCharts'
import { StatsModules } from '@/components/admin/StatsModules'
import { StatsActivity } from '@/components/admin/StatsActivity'

export default async function StatsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div>Error: Acceso no autorizado</div>
  }

  // Obtener estadísticas generales
  const [
    totalUsers,
    totalClients,
    totalPrograms,
    totalNews,
    totalVideos,
    totalSponsors,
    totalPromotions,
    activeToday,
    newLastWeek,
    clientsWithContent,
    recentActivity
  ] = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.program.count(),
    prisma.news.count(),
    prisma.rankingVideo.count(),
    prisma.sponsor.count(),
    prisma.promotion.count(),
    prisma.user.count({
      where: {
        updatedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setDate(new Date().getDate() - 7))
        }
      }
    }),
    prisma.client.count({
      where: {
        OR: [
          { programs: { some: {} } },
          { news: { some: {} } },
          { rankingVideos: { some: {} } },
          { sponsors: { some: {} } },
          { promotions: { some: {} } }
        ]
      }
    }),
    prisma.user.findMany({
      where: {
        role: 'CLIENT'
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10,
      include: {
        client: true
      }
    })
  ])

  // Datos para gráficos
  const contentByType = [
    { name: 'Programas', value: totalPrograms, color: '#3b82f6' },
    { name: 'Noticias', value: totalNews, color: '#10b981' },
    { name: 'Videos', value: totalVideos, color: '#8b5cf6' },
    { name: 'Sponsors', value: totalSponsors, color: '#f59e0b' },
    { name: 'Promociones', value: totalPromotions, color: '#ec4899' }
  ]

  // Datos para gráfico de usuarios por día (últimos 30 días)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - i))
    return date.toISOString().split('T')[0]
  })

  // Obtener usuarios creados por día
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const userCreations = await prisma.user.groupBy({
    by: ['createdAt'],
    where: {
      createdAt: {
        gte: thirtyDaysAgo
      }
    },
    _count: {
      id: true
    }
  })

  // Formatear datos para el gráfico
  const usersByDay = last30Days.map(day => {
    const matchingDay = userCreations.filter(u => {
      const creationDate = new Date(u.createdAt)
      return creationDate.toISOString().split('T')[0] === day
    })
    
    const count = matchingDay.reduce((sum, current) => sum + current._count.id, 0)
    
    return {
      date: day,
      count
    }
  })

  // Obtener clientes más activos
  const topClients = await prisma.client.findMany({
    take: 5,
    include: {
      user: true,
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
    orderBy: {
      updatedAt: 'desc'
    }
  })

  // Calcular total de contenido por cliente
  const clientsWithTotalContent = topClients.map(client => ({
    ...client,
    totalContent: 
      client._count.programs + 
      client._count.news + 
      client._count.rankingVideos + 
      client._count.sponsors + 
      client._count.promotions
  })).sort((a, b) => b.totalContent - a.totalContent)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Estadísticas Globales
        </h1>
        <p className="text-gray-400">
          Métricas y análisis completo del sistema
        </p>
      </div>

      <StatsOverview 
        totalUsers={totalUsers}
        totalClients={totalClients}
        totalContent={totalPrograms + totalNews + totalVideos + totalSponsors + totalPromotions}
        activeToday={activeToday}
        newLastWeek={newLastWeek}
        clientsWithContent={clientsWithContent}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <StatsCharts 
          usersByDay={usersByDay}
          contentByType={contentByType}
        />
        
        <StatsModules 
          programs={totalPrograms}
          news={totalNews}
          videos={totalVideos}
          sponsors={totalSponsors}
          promotions={totalPromotions}
          topClients={clientsWithTotalContent}
        />
      </div>

      <StatsActivity recentActivity={recentActivity} />
    </div>
  )
}