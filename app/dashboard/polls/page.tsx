import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { PlusIcon } from '@heroicons/react/24/outline'
import { PollsList } from '@/components/dashboard/PollsList'

export default async function PollsPage() {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'polls')
      if (!allowed) redirect('/dashboard')
    }
  }

  const session = await getServerSession(authOptions)
  if (!session?.user.clientId) return <div>Error: No se encontró información del cliente</div>

  const polls = await prisma.poll.findMany({
    where: { clientId: session.user.clientId },
    include: { options: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Encuestas</h1>
          <p className="mt-1 text-sm text-gray-600">Crea encuestas para tus oyentes y consulta los resultados</p>
        </div>
        <Link href="/dashboard/polls/new" className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" /> Nueva Encuesta
        </Link>
      </div>
      <PollsList polls={polls} />
    </div>
  )
}
