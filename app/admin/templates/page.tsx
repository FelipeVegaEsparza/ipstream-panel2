import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TemplatesManager } from '@/components/admin/TemplatesManager'

export default async function TemplatesPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div>Error: Acceso no autorizado</div>
  }

  const templates = await prisma.template.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { clients: true }
      }
    }
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Plantillas de Sitio
        </h1>
        <p className="text-gray-400">
          Gestiona las plantillas disponibles para los sitios web de tus clientes
        </p>
      </div>

      <TemplatesManager templates={templates} />
    </div>
  )
}
