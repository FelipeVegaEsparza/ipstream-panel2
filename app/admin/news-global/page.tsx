import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GlobalNewsManager } from '@/components/admin/GlobalNewsManager'

export default async function GlobalNewsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div>Error: Acceso no autorizado</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Noticias Genéricas
        </h1>
        <p className="text-gray-400">
          Gestiona las noticias globales que se mostrarán a los clientes que activen esta opción
        </p>
      </div>

      <GlobalNewsManager />
    </div>
  )
}
