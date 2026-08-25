import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { StreamingServersManager } from '@/components/admin/StreamingServersManager'

export const dynamic = 'force-dynamic'

export default async function ServersPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div>Error: Acceso no autorizado</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Servidores de Streaming
        </h1>
        <p className="text-gray-400">
          Registrá los nodos de radio y TV. Cada cliente se asigna a un servidor por servicio;
          el panel nunca migra clientes automáticamente.
        </p>
      </div>
      <StreamingServersManager />
    </div>
  )
}
