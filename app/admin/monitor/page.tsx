import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MonitorClient } from '@/components/admin/MonitorClient'

export default async function MonitorPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div>Error: Acceso no autorizado</div>
  }

  return <MonitorClient />
}
