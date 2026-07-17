import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NewsCategoriesManager } from '@/components/admin/NewsCategoriesManager'

export default async function NewsCategoriesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div>Error: Acceso no autorizado</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Categorías de Noticias
        </h1>
        <p className="text-gray-400">
          Gestiona las categorías de noticias genéricas disponibles para los clientes
        </p>
      </div>

      <NewsCategoriesManager />
    </div>
  )
}
