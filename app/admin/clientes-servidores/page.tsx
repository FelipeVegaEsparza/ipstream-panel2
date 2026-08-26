import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ClientServersView } from '@/components/admin/ClientServersView'

export const dynamic = 'force-dynamic'

export default async function ClientesServidoresPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div>Error: Acceso no autorizado</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Clientes y Servidores</h1>
        <p className="text-gray-400">
          Cada usuario con su servidor de streaming asignado y sus puertos (radio y TV).
        </p>
      </div>
      <ClientServersView />
    </div>
  )
}
